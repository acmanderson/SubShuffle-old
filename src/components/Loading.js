import React from "react";
import CircularProgress from "material-ui/CircularProgress";
import {grey800} from "material-ui/styles/colors";

const Loading = props => {
    const style = {
        left: `calc(50% - 20px)`,
        top: `calc(50% - 20px)`,
    };

    return (
        <div style={{width: `100vw`, height: `100vh`, backgroundColor: grey800}}>
            <CircularProgress size={40} style={style}/>
            {props.children}
        </div>
    );
};

export default Loading;