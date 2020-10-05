import React from 'react';
import { view } from '@risingstack/react-easy-state';
//import 'cross-fetch/polyfill';
import { useStyles } from '../material-ui-styles.js';
import Select from '@material-ui/core/Select';
import MenuItem from '@material-ui/core/MenuItem';
import FormControl from '@material-ui/core/FormControl';
import InputLabel from '@material-ui/core/InputLabel';
import Button from '@material-ui/core/Button'
import TextField from '@material-ui/core/TextField';
import { appStore, traversalOption, resolutionOption } from '../global-config.js';
import { Widget } from './widget.js';

//------------------------------------------------------------------------------
const ConfigurationForm = view(({ invokeStartMaster, invokeStartViewer }) => {

  const classes = useStyles();
  return (
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
        label="Client ID (only used for VIEWER role)"
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
          id="resolution"
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
      <Button variant="contained" color="primary" onClick={invokeStartViewer}>
        Start Viewer
      </Button>
    </Widget>
 );
});

export { ConfigurationForm };