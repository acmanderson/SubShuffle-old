import React from "react";
import ReactDOM from "react-dom";
import {createStore, applyMiddleware} from "redux";
import {Provider} from "react-redux";
import thunkMiddleware from "redux-thunk";
import rootReducer from "./reducers";
import { Router, Route, browserHistory, IndexRedirect } from 'react-router';
// import App from "./App";
import Login from "./Login";
import Main from "./Main";
import "./index.css";

const store = createStore(
    rootReducer,
    applyMiddleware(
        thunkMiddleware,
    ),
);

function App(props) {
    return (
        props.children
    );
}

function redirectUnlessAuthenticated(nextState, replace) {
    const {authenticated} = store.getState();
    if (!authenticated) {
        replace('/login');
    }
}

ReactDOM.render(
    <Provider store={store}>
        <Router history={browserHistory}>
            <Route path="/" component={Main} onEnter={redirectUnlessAuthenticated} />
            <Route path="/login" component={Login} />
        </Router>
    </Provider>,
    document.getElementById('root')
);
