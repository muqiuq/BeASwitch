using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;

namespace BeASwitch
{
    public class SwitchEngine : ICollection<SwitchPort>
    {

        Dictionary<int, MacTable> macTablePerVlan = new Dictionary<int, MacTable>();
        List<SwitchPort> Ports = new List<SwitchPort>();

        public SwitchEngine(int num)
        {
            for(var n = 0; n < num; n++)
            {
                Ports.Add(new SwitchPort(n));
            }
        }

        public string GetMacTablesAsPrettyString()
        {
            var output = "";
            foreach(var macTable in macTablePerVlan)
            {
                output += $"\n>> VLAN {macTable.Key} << \n";
                output += macTable.Value.ToString();
            }
            return output;
        }

        public void ClearMacAddressTables()
        {
            macTablePerVlan.Clear();
            }

        public SwitchAction ProcessEthernetFrame(EthernetFrame ethernetFrame)
        {
            if (ethernetFrame.AttachedCurrentlyToSwitchPort == null) return null;
            // Check if Vlan is avaiable at Port
            int vlanToUse = 0;
            if(!ethernetFrame.vlanTag.HasValue)
            {
                if(ethernetFrame.AttachedCurrentlyToSwitchPort.Untagged.Count == 0)
                {
                    return new SwitchAction(SwitchActionType.DISCARD, ethernetFrame, vlanToUse);
                }
                vlanToUse = ethernetFrame.AttachedCurrentlyToSwitchPort.Untagged[0];
            }
            else
            {
                if (!ethernetFrame.AttachedCurrentlyToSwitchPort.Tagged.Contains(ethernetFrame.vlanTag.Value))
                {
                    return new SwitchAction(SwitchActionType.DISCARD, ethernetFrame, vlanToUse);
                }
                vlanToUse = ethernetFrame.vlanTag.Value;
            }

            if(!macTablePerVlan.ContainsKey(vlanToUse))
            {
                macTablePerVlan[vlanToUse] = new MacTable();
            }
            // Make Entry for sourceMac
            macTablePerVlan[vlanToUse][ethernetFrame.SourceHost.MAC] = ethernetFrame.AttachedCurrentlyToSwitchPort;

            // Search Dest MAC 
            if(macTablePerVlan[vlanToUse].IsMacAddressKnown(ethernetFrame.DestMac))
            {
                return new SwitchAction(SwitchActionType.UNICAST, ethernetFrame, vlanToUse, macTablePerVlan[vlanToUse][ethernetFrame.DestMac]);
            }
            else
            {
                return new SwitchAction(SwitchActionType.BROADCAST, ethernetFrame, vlanToUse);
            }

        }

        public void ClearAllPorts()
        {
            Ports.ForEach(p =>
            {
                p.ClearMarks();
                p.ClearCheckBoxes();
            }
            );
        }

        public SendAndTagDecisionPerPort GetTagAndSendDecisions(int vlan)
        {
            var sendAndTagDecisionPerPort = new SendAndTagDecisionPerPort();
            foreach(var switchPort in Ports)
            {
                bool vlanSet = false;
                bool tagit = false;
                if(switchPort.Untagged.Contains(vlan))
                {
                    vlanSet = true;
                }
                else if (switchPort.Tagged.Contains(vlan))
                {
                    vlanSet = true;
                    tagit = true;
                }
                sendAndTagDecisionPerPort.Set(switchPort, vlanSet, tagit);
            }
            return sendAndTagDecisionPerPort;
        }

        public List<int> GetAvaiableVlans()
        {
            var vlans = new List<int>();
            Ports.ForEach(p =>
            {
                p.Tagged.ForEach(i => { if (!vlans.Contains(i)) vlans.Add(i); });
                p.Untagged.ForEach(i => { if (!vlans.Contains(i)) vlans.Add(i); });
            });
            return vlans;
        }

        public SwitchPort this[int i]
        {
            get { return Ports[i]; }
        }

        public int Count => Ports.Count;

        public bool IsReadOnly => false;

        public void Add(SwitchPort item)
        {
            Ports.Add(item);
        }

        public void Clear()
        {
            Ports.Clear();
        }

        public bool Contains(SwitchPort item)
        {
            return Ports.Contains(item);
        }

        public void CopyTo(SwitchPort[] array, int arrayIndex)
        {
            Ports.CopyTo(array, arrayIndex);
        }

        public IEnumerator<SwitchPort> GetEnumerator()
        {
            return Ports.GetEnumerator();
        }

        public bool Remove(SwitchPort item)
        {
            return Ports.Remove(item);
        }

        IEnumerator IEnumerable.GetEnumerator()
        {
            return Ports.GetEnumerator();
        }
    }
}
