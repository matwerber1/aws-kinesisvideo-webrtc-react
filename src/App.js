import React, { useRef } from 'react';
//import Amplify, { Auth } from 'aws-amplify';
import Amplify from 'aws-amplify';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react';
//import KinesisVideo from 'aws-sdk/clients/kinesisvideo';
//import KinesisVideoSignalingChannels from 'aws-sdk/clients/kinesisvideosignalingchannels';
import './App.css';
//import { Role, SignalingClient } from 'amazon-kinesis-video-streams-webrtc';
import { view } from '@risingstack/react-easy-state';
//import 'cross-fetch/polyfill';
import { ConfigurationForm } from './components/configuration-form.js';
//import { traversalOption, clientRole, resolutionOption, appStore } from './global-config.js';
import { appStore } from './global-config.js';
import { Widget } from './components/widget.js';
import { MasterVideoPlayers, ViewerVideoPlayers } from './components/video-players.js';
import { startMaster } from './video/start-master.js';

import awsExports from "./aws-exports";
Amplify.configure(awsExports);

//------------------------------------------------------------------------------
const App = view(() => {

  appStore.master.view.local.ref = useRef(null);
  appStore.master.view.remote.ref = useRef(null);
  appStore.viewer.view.local.ref = useRef(null);
  appStore.viewer.view.remote.ref = useRef(null);

  function invokeStartMaster() {
    appStore.master.showVideoPlayers = true;
    startMaster(appStore.master.view.local.ref, appStore.master.view.remote.ref);
  }

  function invokeStartViewer() {
    appStore.viewer.showVideoPlayers = true;
    startViewer(appStore.viewer.view.local.ref, appStore.viewer.view.remote.ref);
  }

  return (
    <div>
      <AmplifySignOut />
      <ConfigurationForm invokeStartMaster={invokeStartMaster} invokeStartViewer={invokeStartViewer} />
      <Widget>
        <MasterVideoPlayers/>
        <ViewerVideoPlayers/>
      </Widget>
    </div>
  );

  });

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
function startViewer() {

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
/*
//------------------------------------------------------------------------------
const MasterVideoPlayers = view(() => {
  return (
    <div id="master" className="d-none">
      <h2>Master</h2>
      <div className="row">
          <div className="col">
              <h5>Master Section</h5>
        <div className="video-container"><video src={appStore.master.view.local.srcObject} ref={appStore.master.view.local.ref} className="local-view" autoPlay playsInline controls muted /></div>
          </div>
          <div className="col">
              <h5>Viewer Return Channel</h5>
              <div className="video-container"><video src={appStore.master.view.remote.srcObject} ref={appStore.master.view.remote.ref} className="remote-view" autoPlay playsInline controls /></div>
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
  );
});

//------------------------------------------------------------------------------
const ViewerVideoPlayers = view(() => {
  return (
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
  );
});
*/

export default withAuthenticator(App);