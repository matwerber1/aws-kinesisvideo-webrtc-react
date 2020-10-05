import KinesisVideo from 'aws-sdk/clients/kinesisvideo';
import KinesisVideoSignalingChannels from 'aws-sdk/clients/kinesisvideosignalingchannels';
import { SignalingClient } from 'amazon-kinesis-video-streams-webrtc';
//import 'cross-fetch/polyfill';
import { traversalOption, clientRole, resolutionOption, appStore } from '../global-config.js';
import Amplify, { Auth } from 'aws-amplify';
import awsExports from "../aws-exports";
Amplify.configure(awsExports);


const startMaster = async function (localView, remoteView) {

  console.log('Getting creds...');
  var credentials = await Auth.currentCredentials();
  
  // Create KVS client
  console.log('Created KVS client...');
  const kinesisVideoClient = new KinesisVideo({
    region: appStore.region,
    credentials: Auth.essentialCredentials(credentials),
    endpoint: appStore.endpoint || null,
    correctClockSkew: true,
  });

  // Get signaling channel ARN
  console.log('Getting signaling channel ARN...');
  const describeSignalingChannelResponse = await kinesisVideoClient
    .describeSignalingChannel({
        ChannelName: appStore.channelName,
    })
    .promise();
  
  const channelARN = describeSignalingChannelResponse.ChannelInfo.ChannelARN;
  console.log('[MASTER] Channel ARN: ', channelARN);

  // Get signaling channel endpoints:
  console.log('Getting signaling channel endpoints...');
  const getSignalingChannelEndpointResponse = await kinesisVideoClient
    .getSignalingChannelEndpoint({
        ChannelARN: channelARN,
        SingleMasterChannelEndpointConfiguration: {
            Protocols: ['WSS','HTTPS'],
            Role: clientRole.MASTER,
        },
  })
  .promise();

  const endpointsByProtocol = getSignalingChannelEndpointResponse.ResourceEndpointList.reduce((endpoints, endpoint) => {
    endpoints[endpoint.Protocol] = endpoint.ResourceEndpoint;
    return endpoints;
  }, {});  
  console.log('[MASTER] Endpoints: ', endpointsByProtocol);

  // Create Signaling Client
  console.log(`Creating signaling ${appStore.protocol} client...`);
  appStore.master.signalingClient = new SignalingClient({
    channelARN,
    channelEndpoint: endpointsByProtocol.WSS,
    credentials: Auth.essentialCredentials(credentials),
    role: clientRole.MASTER,
    region: appStore.region,
    systemClockOffset: kinesisVideoClient.config.systemClockOffset,
  });

  // Get ICE server configuration
  console.log('Creating ICE server configuration...');
  const kinesisVideoSignalingChannelsClient = new KinesisVideoSignalingChannels({
    region: appStore.region,
    credentials: Auth.essentialCredentials(credentials),
    endpoint: endpointsByProtocol.HTTPS,
    correctClockSkew: true,
  });

  console.log('Getting ICE server config response...');
  const getIceServerConfigResponse = await kinesisVideoSignalingChannelsClient
        .getIceServerConfig({
            ChannelARN: channelARN,
        })
    .promise();
  
  const iceServers = [];
  if (appStore.natTraversal === traversalOption.STUN_TURN) {
    console.log('Getting STUN servers...');
    iceServers.push({ urls: `stun:stun.kinesisvideo.${appStore.region}.amazonaws.com:443` });
  }

  if (appStore.natTraversal !== traversalOption.DISABLED) {
    console.log('Getting TURN servers...');
    getIceServerConfigResponse.IceServerList.forEach(iceServer =>
      iceServers.push({
        urls: iceServer.Uris,
        username: iceServer.Username,
        credential: iceServer.Password,
      }),
    );
  }
  
  console.log('[MASTER] ICE servers: ', iceServers);

  const configuration = {
    iceServers,
    iceTransportPolicy: (appStore.natTraversal === traversalOption.TURN_ONLY) ? 'relay' : 'all',
  };

  const resolution = (appStore.resolution === resolutionOption.WIDESCREEN) ? { width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 640 }, height: { ideal: 480 } };

  const constraints = {
      video: appStore.sendVideo ? resolution : false,
      audio: appStore.sendAudio,
  };

  // Get a stream from the webcam and display it in the local view. 
  // If no video/audio needed, no need to request for the sources. 
  // Otherwise, the browser will throw an error saying that either video or audio has to be enabled.
  if (appStore.sendVideo || appStore.sendAudio) {
    try {
      console.log('Getting user media stream...');
      appStore.master.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      localView.current.srcObject = appStore.master.localStream;

    } catch (e) {
      console.log('Error: ', e);
      console.error('[MASTER] Could not find webcam');
    }
  }

  console.log('Adding signalingClient.on open handler...');
  appStore.master.signalingClient.on('open', async () => {
    console.log('[MASTER] Connected to signaling service');
  });

  console.log('Adding signalingClient.on sdpOffer handler...');
  appStore.master.signalingClient.on('sdpOffer', async (offer, remoteClientId) => {
    console.log('[MASTER] Received SDP offer from client: ' + remoteClientId);

    // Create a new peer connection using the offer from the given client
    const peerConnection = new RTCPeerConnection(configuration);
    appStore.master.peerConnectionByClientId[remoteClientId] = peerConnection;

    if (appStore.openDataChannel) {
      appStore.master.dataChannelByClientId[remoteClientId] = peerConnection.createDataChannel('kvsDataChannel');
      peerConnection.ondatachannel = event => {
        //event.channel.onmessage = onRemoteDataMessage;
      };
    }

    // Poll for connection stats
    if (!appStore.master.peerConnectionStatsInterval) {
      appStore.master.peerConnectionStatsInterval = setInterval(() => peerConnection.getStats().then(onStatsReport), 1000);
    }

    // Send any ICE candidates to the other peer
    peerConnection.addEventListener('icecandidate', ({ candidate }) => {
      if (candidate) {
        console.log('[MASTER] Generated ICE candidate for client: ' + remoteClientId);

        // When trickle ICE is enabled, send the ICE candidates as they are generated.
        if (appStore.useTrickleIce) {
          console.log('[MASTER] Sending ICE candidate to client: ' + remoteClientId);
          appStore.master.signalingClient.sendIceCandidate(candidate, remoteClientId);
        }
      } else {
        console.log('[MASTER] All ICE candidates have been generated for client: ' + remoteClientId);

        // When trickle ICE is disabled, send the answer now that all the ICE candidates have ben generated.
        if (!appStore.useTrickleIce) {
          console.log('[MASTER] Sending SDP answer to client: ' + remoteClientId);
          appStore.master.signalingClient.sendSdpAnswer(peerConnection.localDescription, remoteClientId);
        }
      }
    });

    // As remote tracks are received, add them to the remote view
    console.log('Adding peerConnection listener for "track"...');
    
    peerConnection.addEventListener('track', event => {
      console.log('[MASTER] Received remote track from client: ' + remoteClientId);
      //if (remoteView.current.srcObject) {
        //return;
      //}
        
      remoteView.current.srcObject = event.streams[0];
    });

    // If there's no video/audio, master.localStream will be null. So, we should skip adding the tracks from it.
    if (appStore.master.localStream) {
      console.log("There's no audio/video...");
      appStore.master.localStream.getTracks().forEach(track => peerConnection.addTrack(track, appStore.master.localStream));
    }
    await peerConnection.setRemoteDescription(offer);

    // Create an SDP answer to send back to the client
    console.log('[MASTER] Creating SDP answer for client: ' + remoteClientId);
    await peerConnection.setLocalDescription(
      await peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      }),
    );

    // When trickle ICE is enabled, send the answer now and then send ICE candidates as they are generated. Otherwise wait on the ICE candidates.
    if (appStore.useTrickleIce) {
      console.log('[MASTER] Sending SDP answer to client: ' + remoteClientId);
      appStore.master.signalingClient.sendSdpAnswer(peerConnection.localDescription, remoteClientId);
    }
    console.log('[MASTER] Generating ICE candidates for client: ' + remoteClientId);
  
  });

    appStore.master.signalingClient.on('iceCandidate', async (candidate, remoteClientId) => {
        console.log('[MASTER] Received ICE candidate from client: ' + remoteClientId);

        // Add the ICE candidate received from the client to the peer connection
        const peerConnection = appStore.master.peerConnectionByClientId[remoteClientId];
        peerConnection.addIceCandidate(candidate);
    });

    appStore.master.signalingClient.on('close', () => {
        console.log('[MASTER] Disconnected from signaling channel');
    });

    appStore.master.signalingClient.on('error', () => {
        console.error('[MASTER] Signaling client error');
    });

    console.log('[MASTER] Starting master connection');
    appStore.master.signalingClient.open();    

}

//------------------------------------------------------------------------------

function onStatsReport(report) {
  // TODO: Publish stats
}

export { startMaster };