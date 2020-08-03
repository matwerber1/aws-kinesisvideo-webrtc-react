import React, { useEffect, useRef } from 'react';
import Amplify, { Auth } from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
import KinesisVideo from 'aws-sdk/clients/kinesisvideo';
import KinesisVideoSignalingChannels from 'aws-sdk/clients/kinesisvideosignalingchannels';
import './App.css';
import { Role, SignalingClient } from 'amazon-kinesis-video-streams-webrtc';
import { view, store } from '@risingstack/react-easy-state';
//import 'cross-fetch/polyfill';
import { makeStyles } from '@material-ui/core/styles';
import Container from '@material-ui/core/Container';
import Paper from '@material-ui/core/Paper';
import Box from '@material-ui/core/Box';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField';

import awsExports from "./aws-exports";
Amplify.configure(awsExports);
//------------------------------------------------------------------------------

const traversalOption = {
  STUN_TURN: 'stunTurn',
  TURN_ONLY: 'turnOnly',
  DISABLED: 'disabled'
};

const clientRole = {
  MASTER: 'MASTER',
  VIEWER: 'VIEWER'
};

const resolutionOption = {
  WIDESCREEN: 'widescreen',
  FULLSCREEN: 'fullscreen'
}

const appStore = store({
  channelName: 'avatar-demo',
  region: 'us-west-2',
  clientId: getRandomClientId(),
  endpoint: '',
  natTraversal: traversalOption.STUN_TURN,
  resolution: resolutionOption.WIDESCREEN,
  sendVideo: true, 
  sendAudio: true,
  openDataChannel: true,
  useTrickleIce: true,
  master: {
    signalingClient: null,
    peerConnectionByClientId: {},
    dataChannelByClientId: {},
    localStream: null,
    remoteStreams: [],
    peerConnectionStatsInterval: null,
    view: {
      local: {
        srcObject: null
      },
      remote: {
        srcObject: null,      }
    }
  }

});

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
  },
  textField: {
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1),
    width: '25ch',
  },
}));

//------------------------------------------------------------------------------
const App = view(() => {
  const classes = useStyles();

  const masterLocalRef = useRef(null);
  const masterRemoteRef = useRef(null);
  // <video> HTML elements to use to display the local webcam stream and remote stream from the master

  function invokeStartMaster() {

    startMaster(masterLocalRef, masterRemoteRef);
  }

  return (
    <div>
      <AmplifySignOut />
      <Widget>
      <TextField
          className={classes.root}
          id="region"
          label="Region"
          onChange={(e) => appStore.region = e.target.value}
          value={appStore.region} 
        />
        <br/>
        <TextField
          className={classes.root}
          id="channelName"
          label="Channel name"
          onChange={(e) => appStore.channelName = e.target.value}
          value={appStore.channelName} 
        />
        <br/>
        <TextField
          className={classes.root}
          id="clientId"
          label="Client ID"
          onChange={(e) => appStore.clientId = e.target.value}
          value={appStore.clientId} 
        />
        <br />

        <FormControl className={classes.formControl}>
          <InputLabel id="nat-label">NAT Traversal</InputLabel>
          <Select
            labelId="NAT-Traversal"
            id="nat-traversal"
            value={appStore.natTraversal}
            onChange={(e) => appStore.natTraversal = e.target.value}
          >
            <MenuItem value={traversalOption.STUN_TURN}>STUN/TURN</MenuItem>
            <MenuItem value={traversalOption.TURN_ONLY}>TURN Only (force cloud relay)</MenuItem>
            <MenuItem value={traversalOption.DISABLED}>Disabled</MenuItem>
          </Select>
        </FormControl>
        <br/><br/>
        <FormControl className={classes.formControl}>
          <InputLabel id="resolution-label">Resolution</InputLabel>
          <Select
            labelId="resolution"
            id="nresolution"
            value={appStore.resolution}
            onChange={(e) => appStore.resolution = e.target.value}
          >
            <MenuItem value={resolutionOption.WIDESCREEN}>1280x720 (16:9 widescreen)</MenuItem>
            <MenuItem value={resolutionOption.FULLSCREEN}>640x480 (4:3 fullscreen)</MenuItem>

          </Select>
        </FormControl>
        <br/><br/>
        <Button variant="contained" color="primary" onClick={invokeStartMaster}>
          Start Master
        </Button>
        <br />
        <br/>
        <Button variant="contained" color="primary">
          Start Viewer
        </Button>
      </Widget>
      <Widget>
      <div id="master" className="d-none">
            <h2>Master</h2>
            <div className="row">
                <div className="col">
                    <h5>Master Section</h5>
              <div className="video-container"><video src={appStore.master.view.local.srcObject} ref={masterLocalRef} className="local-view" autoPlay playsInline controls muted /></div>
                </div>
                <div className="col">
                    <h5>Viewer Return Channel</h5>
                    <div className="video-container"><video src={appStore.master.view.remote.srcObject} ref={masterRemoteRef} className="remote-view" autoPlay playsInline controls /></div>
                </div>
            </div>
            <div className="row datachannel">
                <div className="col">
                    <div className="form-group">
                      <textarea type="text" className="form-control local-message" placeholder="DataChannel Message"/>
                    </div>
                </div>
                <div className="col">
                    <div className="card bg-light mb-3">
                        <pre className="remote-message card-body text-monospace preserve-whitespace"></pre>
                    </div>
                </div>
            </div>
            <div>
                <span className="send-message datachannel">
                  <button type="button" className="btn btn-primary">Send DataChannel Message</button>
                </span>
                <button id="stop-master-button" type="button" className="btn btn-primary">Stop Master</button>
            </div>
        </div>

        <div id="viewer" className="d-none">
            <h2>Viewer</h2>
            <div className="row">
                <div className="col">
                    <h5>Return Channel</h5>
                    <div className="video-container"><video className="local-view" autoPlay playsInline controls muted /></div>
                </div>
                <div className="col">
                    <h5>From Master</h5>
                    <div className="video-container"><video className="remote-view" autoPlay playsInline controls /></div>
                </div>
            </div>
            <div className="row datachannel">
                <div className="col">
                    <div className="form-group">
                      <textarea type="text" className="form-control local-message" placeholder="DataChannel Message"/>
                    </div>
                </div>
                <div className="col">
                    <div className="card bg-light mb-3">
                        <pre className="remote-message card-body text-monospace preserve-whitespace"></pre>
                    </div>
                </div>
            </div>
            <div>
                <span className="send-message datachannel" className="d-none">
                  <button type="button" className="btn btn-primary">Send DataChannel Message</button>
                </span>
                <button id="stop-viewer-button" type="button" className="btn btn-primary">Stop Viewer</button>
            </div>
        </div>
      </Widget>
    </div>
  );

});
//------------------------------------------------------------------------------

// TODO: the function params are not currently being passed in properly...
//async function startMaster (onRemoteDataMessage) {

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

// Get signaling channel endpoints
console.log('Getting signaling channel endpoints...');
const getSignalingChannelEndpointResponse = await kinesisVideoClient
  .getSignalingChannelEndpoint({
      ChannelARN: channelARN,
      SingleMasterChannelEndpointConfiguration: {
          Protocols: ['WSS', 'HTTPS'],
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
  console.log('Creating signaling client...');
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
    console.log('Using STUN/TURN NAT traversal...');
    iceServers.push({ urls: `stun:stun.kinesisvideo.${appStore.region}.amazonaws.com:443` });
  }

  if (appStore.natTraversal !== traversalOption.DISABLED) {
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
      //appStore.master.view.local.ref.srcObject = appStore.master.localStream;
      //appStore.master.view.local.ref.srcObject = appStore.master.localStream;
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
      if (appStore.master.view.remote.srcObject) {
        return;
      }
        
      appStore.master.view.remote.srcObject = event.streams[0];
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

function stopMaster() {
  console.log('[MASTER] Stopping master connection');
  if (appStore.kvs.master.signalingClient) {
    appStore.kvs.master.signalingClient.close();
    appStore.kvs.master.signalingClient = null;
  }

  Object.keys(appStore.kvs.master.peerConnectionByClientId).forEach(clientId => {
    appStore.kvs.master.peerConnectionByClientId[clientId].close();
  });
  appStore.kvs.master.peerConnectionByClientId = [];

  if (appStore.kvs.master.localStream) {
    appStore.kvs.master.localStream.getTracks().forEach(track => track.stop());
    appStore.kvs.master.localStream = null;
  }

  appStore.kvs.master.remoteStreams.forEach(remoteStream => remoteStream.getTracks().forEach(track => track.stop()));
  appStore.kvs.master.remoteStreams = [];

  if (appStore.kvs.master.peerConnectionStatsInterval) {
      clearInterval(appStore.kvs.master.peerConnectionStatsInterval);
      appStore.kvs.master.peerConnectionStatsInterval = null;
  }

  if (appStore.kvs.master.localView) {
    appStore.kvs.master.localView.srcObject = null;
  }

  if (appStore.kvs.master.remoteView) {
    appStore.kvs.master.remoteView.srcObject = null;
  }

  if (appStore.kvs.master.dataChannelByClientId) {
    appStore.kvs.master.dataChannelByClientId = {};
  }
}

//------------------------------------------------------------------------------

function sendMasterMessage(message) {
  Object.keys(appStore.kvs.master.dataChannelByClientId).forEach(clientId => {
      try {
        appStore.kvs.master.dataChannelByClientId[clientId].send(message);
      } catch (e) {
          console.error('[MASTER] Send DataChannel: ', e.toString());
      }
  });
}


//------------------------------------------------------------------------------
const Widget = view(({ children }) => {
  return (
    <Container>
      <Paper elevation={3}>
        <Box p={2} m={1}>
          {children}
        </Box>
      </Paper>
    </Container>
  );
});

//------------------------------------------------------------------------------
function getRandomClientId() {
  return Math.random()
      .toString(36)
      .substring(2)
      .toUpperCase();
}

//------------------------------------------------------------------------------
export default withAuthenticator(App);


const delay = ms => new Promise(res => setTimeout(res, ms));

function onStatsReport(report) {
  // TODO: Publish stats
}