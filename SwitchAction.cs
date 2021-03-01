using System;
using System.Collections.Generic;
using System.Text;

namespace VLANSimulator
{
    public class SwitchAction
    {
        public SwitchAction(SwitchActionType type, EthernetFrame frame, int vLANID, SwitchPort destPort = null)
        {
            this.Type = type;
            this.Frame = frame;
            DestPort = destPort;
            VLANID = vLANID;
        }


        public SwitchPort DestPort { get; private set; }
        public EthernetFrame Frame { get; private set; }
        public SwitchActionType Type { get; private set; }
        public int VLANID { get; private set; }

        public override string ToString()
        {
            var destPortText = DestPort != null ? $" to {DestPort.Num}" : "";
            return $"({Frame.SourceHost.MAC} => {Frame.DestMac}) (VLAN {VLANID}) {Type}{destPortText}";
        }

    }
}
