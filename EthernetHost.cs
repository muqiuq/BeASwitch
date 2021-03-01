using System;
using System.Collections.Generic;
using System.Text;

namespace VLANSimulator
{
    public class EthernetHost
    {
        public EthernetHost(string mAC, int vlan, SwitchPort attachedToPort)
        {
            MAC = mAC;
            this.vlan = vlan;
            AttachedToPort = attachedToPort;
        }

        public string MAC { get; private set; }
        public int vlan { get; private set; }
        public SwitchPort AttachedToPort { get; }
    }
}
