import React from "react";
import TextTruncate from "react-text-truncate";
import Drawer from "material-ui/Drawer";
import Avatar from "material-ui/Avatar";
import Toggle from "material-ui/Toggle";
import ActionCheckCircle from "material-ui/svg-icons/action/check-circle";
import {List, ListItem} from "material-ui/List";
import {spacing, typography} from "material-ui/styles";
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
    avatarStyle: {
        border: `2px white solid`,
        borderRadius: `50%`,
        top: 14,
    },
    listItemStyle: {
        fontSize: 14,
    },
};

function Channel(props) {
    function handleToggle(_, checked) {
        props.onChannelToggled(props.channelId, checked);
    }

    return (
        <ListItem
            primaryText={<TextTruncate
                line={1}
                truncateText="…"
                text={props.title}
            />}
            leftAvatar={<Avatar
                src={props.iconUrl}
                size={24}
                style={styles.avatarStyle}
            />}
            rightToggle={<Toggle
                toggled={props.selected}
                onToggle={handleToggle}
            />}
            style={styles.listItemStyle}
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
                selected={props.selectedChannels.indexOf(channelId) !== -1}
                channelId={channelId}
                onChannelToggled={props.onChannelToggled}
                key={channelId}
            />
        )
    });
    listItems.unshift(
        <ListItem
            primaryText="Toggle All"
            leftAvatar={<ActionCheckCircle
                size={24}
                color={red700}
                style={styles.avatarStyle}
            />}
            rightToggle={<Toggle
                toggled={props.toggleAllChecked}
                onToggle={props.onAllChannelsToggled}
            />}
            style={styles.listItemStyle}
            key="toggleall"
        />
    );

    return (
        <Drawer open={props.open}
                docked={props.docked}
                onRequestChange={props.onRequestChange}>
            <div style={styles.logo}>
                {props.docked ? "SubShuffle" : "Channels"}
            </div>
            <List>
                {listItems}
            </List>
        </Drawer>
    );
}

export default ChannelDrawer;