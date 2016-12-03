import React from "react";
import Drawer from "material-ui/Drawer";
import {List, ListItem} from "material-ui/List";
import Avatar from "material-ui/Avatar";
import Checkbox from "material-ui/Checkbox";
import TextTruncate from "react-text-truncate";
import {spacing, typography, zIndex} from "material-ui/styles";
import {red700} from "material-ui/styles/colors";

const styles = {
  logo: {
    fontSize: 24,
    color: typography.textFullWhite,
    lineHeight: `${spacing.desktopKeylineIncrement}px`,
    fontWeight: typography.fontWeightLight,
    backgroundColor: red700,
    paddingLeft: spacing.desktopGutter,
    marginBottom: 8,
  },
};

function Channel(props) {
    function handleChecked(_, checked) {
        props.onChannelToggled(props.channelId, checked);
    }
    return (
        <ListItem
            primaryText={
                <TextTruncate
                line={1}
                truncateText="…"
                text={props.title}
                />
            }
            rightAvatar={<Avatar
                src={props.iconUrl}
                size={24}
                style={{border: "2px white solid", top: 14}}
            />}
            leftCheckbox={<Checkbox checked={props.selected} onCheck={handleChecked}/>}
            style={{fontSize: "14px"}}
        />
    );
}

function ChannelDrawer(props) {
    const listItems = Object.keys(props.channels).map(channelId => {
        const channel = props.channels[channelId];
        return (
            <Channel
                title={channel.title}
                iconUrl={channel.thumbnailUrl}
                selected={props.selectedChannels.indexOf(channelId) != -1}
                channelId={channelId}
                onChannelToggled={props.onChannelToggled}
                key={channelId}
            />
        )
    });
    return (
        <Drawer open={props.open}
                docked={props.docked}
                onRequestChange={props.onRequestChange}>
            <div style={styles.logo}>
              SubShuffle
            </div>
            <ListItem
                primaryText="Toggle All"
                leftCheckbox={<Checkbox
                    checked={props.toggleAllChecked}
                    onCheck={props.onAllChannelsToggled}
                />}
                style={{fontSize: "14px"}}
            />
            <List>
                {listItems}
            </List>
        </Drawer>
    );
}

export default ChannelDrawer;