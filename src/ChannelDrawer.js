import React from 'react';
import Drawer from 'material-ui/Drawer';
import {List, ListItem} from 'material-ui/List';
import Avatar from 'material-ui/Avatar';
import Toggle from 'material-ui/Toggle';
import Checkbox from 'material-ui/Checkbox';
import TextTruncate from 'react-text-truncate';

function Channel(props) {
    function handleChecked(_, checked) {
        props.handleChannelSelected(props.channelId, checked);
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
                style={{border: "2px white solid"}}
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
                iconUrl={channel.thumbnails.default.url}
                selected={channel.selected}
                channelId={channelId}
                handleChannelSelected={props.handleChannelSelected}
                key={channelId}
            />
        )
    });
    return (
        <Drawer open={props.open}
                docked={false}
                onRequestChange={props.onRequestChange}>
            <ListItem
                primaryText="Toggle All"
                leftCheckbox={<Checkbox checked={props.toggleAllChecked} onCheck={props.handleAllChannelsSelected}/>}
                style={{fontSize: "14px"}}
            />
            <List>
                {listItems}
            </List>
        </Drawer>
    );
}

export default ChannelDrawer;