using System;
using System.Collections.Generic;
using System.Text;

namespace VLANSimulator
{
    public class MacTable
    {

        public Dictionary<string, SwitchPort> macAddressToSwichPort = new Dictionary<string, SwitchPort>();

        public bool IsMacAddressKnown(string MAC)
        {
            return macAddressToSwichPort.ContainsKey(MAC);
        }

        public SwitchPort this[string mac]
        {
            get { return macAddressToSwichPort[mac]; }
            set { macAddressToSwichPort[mac] = value; }
        }

        public override string ToString()
        {
            var output = " MAC  |  Port\n";
               output += "--------------\n";
            foreach(var e in macAddressToSwichPort)
            {
                output += String.Format("{0,-5} | {1,-5}\n", e.Key, e.Value.Num.ToString());
            }
            return output;
        }

    }
}
