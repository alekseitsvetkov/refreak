import React from 'react'
import { version } from '../../manifest'
import ListItemLink from '../components/list-item-link'
import ListItemText from '../components/list-item-text'
import ListSubheader from '../components/list-subheader'

export const ABOUT = 'About'

export default () => (
  <React.Fragment>
    <ListSubheader>About</ListSubheader>
    <ListItemText primary="Version" secondary={version} />
    {/* <ListItemLink
      primary="Website"
      secondary="refreak.gg"
      href="https://refreak.gg"
    />
    <ListItemLink
      primary="Source Code"
      secondary="GitHub"
      href="https://github.com/refreakgg/browser-extension"
    /> */}
    {/* <ListSubheader divider>Community & Social</ListSubheader>
    <ListItemLink primary="Discord" href="https://refreak.gg/discord" />
    <ListItemLink
      primary="Twitter"
      href="https://twitter.com/refreakgg"
      secondary="@refreakgg"
    />
    <ListItemLink primary="Steam Group" steamCommunity="groups/refreakdotgg" /> */}
    <ListSubheader divider>Team</ListSubheader>
    <ListItemLink
      primary="base"
      secondary="Creator & Developer"
      twitter="alekseitsvetkov"
    />
  </React.Fragment>
)
