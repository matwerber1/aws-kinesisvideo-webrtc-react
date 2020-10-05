import { store } from '@risingstack/react-easy-state';


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
    showVideoPlayers: false,
    signalingClient: null,
    peerConnectionByClientId: {},
    dataChannelByClientId: {},
    localStream: null,
    remoteStreams: [],
    peerConnectionStatsInterval: null,
    view: {
      local: {
        srcObject: null,
        ref: null
      },
      remote: {
        srcObject: null,
        ref: null
      }
    }
  },
  viewer: {
    showVideoPlayers: false,
    view: {
      local: {
        srcObject: null,
        ref: null
      },
      remote: {
        srcObject: null,
        ref: null
      }
    }
  }
});

function getRandomClientId() {
  return Math.random()
      .toString(36)
      .substring(2)
      .toUpperCase();
}

export {
  traversalOption, 
  clientRole,
  resolutionOption, 
  appStore
}