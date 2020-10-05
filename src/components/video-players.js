import React from 'react';
import { view } from '@risingstack/react-easy-state';
import { appStore } from '../global-config.js';

//------------------------------------------------------------------------------
const MasterVideoPlayers = view(() => {

  if (appStore.master.showVideoPlayers) {
    return (
      <div id="master" className="d-none">
        <h2>Master</h2>
        <div className="row">
          <div className="col">
            <h5>Master Section</h5>
            <div className="video-container">
              <video
                className="local-view"
                src={appStore.master.view.local.srcObject}
                ref={appStore.master.view.local.ref}
                autoPlay playsInline controls muted
              />
            </div>
          </div>
          <div className="col">
            <h5>Viewer Return Channel</h5>
            <div className="video-container">
              <video
                className="remote-view"
                src={appStore.master.view.remote.srcObject}
                ref={appStore.master.view.remote.ref}
                autoPlay playsInline controls 
              />
            </div>
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
  }
  else {
    return;
  }
});

//------------------------------------------------------------------------------
const ViewerVideoPlayers = view(() => {

  if (appStore.viewer.showVideoPlayers) {
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
            <span className="send-message datachannel d-none">
              <button type="button" className="btn btn-primary">Send DataChannel Message</button>
            </span>
            <button id="stop-viewer-button" type="button" className="btn btn-primary">Stop Viewer</button>
        </div>
      </div>
    );
  }
  else {
    return;
  }
});

export {
  MasterVideoPlayers,
  ViewerVideoPlayers
};