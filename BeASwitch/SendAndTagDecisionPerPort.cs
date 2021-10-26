using System;
using System.Collections.Generic;
using System.Text;

namespace BeASwitch
{
    public class SendAndTagDecisionPerPort
    {
        Dictionary<SwitchPort, bool> tagDecicisionPerPort = new Dictionary<SwitchPort, bool>();
        Dictionary<SwitchPort, bool> sendDecicisionPerPort = new Dictionary<SwitchPort, bool>();

        public bool TagForPort(SwitchPort port)
        {
            return tagDecicisionPerPort[port];
        }

        public bool SendToPort(SwitchPort port)
        {
            return sendDecicisionPerPort[port];
        }

        internal void Set(SwitchPort port, bool vlanSet, bool tagit)
        {
            tagDecicisionPerPort[port] = tagit;
            sendDecicisionPerPort[port] = vlanSet;
        }
    }
}
