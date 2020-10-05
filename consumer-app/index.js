const KinesisVideo = require('aws-sdk/clients/kinesisvideo');
const KinesisVideoSignalingChannels = require('aws-sdk/clients/kinesisvideosignalingchannels');
const { SignalingClient } = require ('amazon-kinesis-video-streams-webrtc');

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

const appStore = {
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
};

function getRandomClientId() {
  return Math.random()
      .toString(36)
      .substring(2)
      .toUpperCase();
}

async function main() {
  console.log('done!');
}

(async () => {
  await main();
})();