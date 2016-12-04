import React from "react";
import ReactDOM from "react-dom";
import {createStore} from "redux";
import {Provider} from "react-redux";
import rootReducer from "./reducers";
import {Router, Route, browserHistory} from "react-router";
import Login from "./components/Login";
import Main from "./components/Main";
import "./index.css";

const store = createStore(rootReducer);

function redirectUnlessAuthenticated(_, replace) {
    const {loginState: {userAuthenticated}} = store.getState();
    if (!userAuthenticated) {
        replace('/login/');
    }
}

ReactDOM.render(
    <Provider store={store}>
        <Router history={browserHistory}>
            <Route path="/" component={Main} onEnter={redirectUnlessAuthenticated}/>
            <Route path="/login/" component={Login}/>
        </Router>
    </Provider>,
    document.getElementById('root')
);
