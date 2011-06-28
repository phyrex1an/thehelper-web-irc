FSM = function(input, states, startstate, state) {
    this.states = states;
    this.currentState = this.states[startstate];
    this.state = state;
    var self = this;
    for(var i in input) {
        this[input[i]] = (function(eventName) {
            return (function(d) {
                var nextStateName = self.currentState(eventName, d, self.state);
                if (nextStateName == null) {
                    for(var i in input) {
                        self[input] = undefined;
                    };
                } else {
                    self.currentState = self.states[nextStateName];
                }
            });
        })(input[i]);
    };
};