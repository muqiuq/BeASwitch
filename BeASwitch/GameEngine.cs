using System;
using System.Collections.Generic;
using System.Text;
using System.Linq;

namespace BeASwitch
{
    public class GameEngine
    {

        public List<string> UsedMacAddresses = new List<string>();

        public static string[] ContentsToUse = { "Hey", "Ping", "The cake is a lie", "Ups", "Please work faster"};

        public GameEngine(SwitchEngine switchEngine/*, InstanceSettings instanceSettings*/)
        {
            SwitchEngine = switchEngine;
            //InstanceSettings = instanceSettings;
            this.PopuplateEthernetHosts();
        }

        public List<EthernetHost> EthernetHosts = new List<EthernetHost>();
        private readonly SwitchEngine SwitchEngine;
        //private readonly InstanceSettings InstanceSettings;

        private void PopuplateEthernetHosts()
        {
            
            Random random = new Random();

            var switchPorts = new List<SwitchPort>();

            SwitchEngine.ToList().ForEach(se => switchPorts.Add(se));

            int maxNumberOfHosts = 12;
            int hostCounter = 0;

            while (hostCounter < maxNumberOfHosts)
            {
                var nextSwitchPort = random.Next(0, Math.Max(switchPorts.Count, 1));
                var switchPort = switchPorts[nextSwitchPort];
                switchPorts.RemoveAt(nextSwitchPort);
                var vlans = switchPort.GetAvaiableVlans();
                var numberOfHosts = maxNumberOfHosts / SwitchEngine.Count();
                var numberOfHostUsed = 0;
                foreach (var vlan in vlans)
                {
                    var numberOfHostsForVlan = numberOfHosts - numberOfHostUsed;
                    if (vlan != vlans.Last())
                    {
                        numberOfHostsForVlan = random.Next(1, numberOfHostsForVlan-1);
                    }
                    numberOfHostUsed += numberOfHostsForVlan;
                    for(int a = 0; a < numberOfHostsForVlan; a++)
                    {
                        var host = Convert.ToChar(65 + hostCounter);
                        EthernetHosts.Add(new EthernetHost(host.ToString(), vlan, switchPort));
                        UsedMacAddresses.Add(host.ToString());
                        hostCounter++;
                    }
                }
                if (switchPorts.Count == 0) break;
            }
        } 

        public EthernetFrame RandomEthernetFrame(SwitchEngine switchEngine)
        {

            Random rand = new Random();

            var ethernetHostsShuffeld = new List<EthernetHost>(EthernetHosts.ToArray<EthernetHost>());
            ethernetHostsShuffeld.Shuffle();
            var sourceHost = ethernetHostsShuffeld[0];
            var possibleDestHosts = EthernetHosts.Where(e => e.vlan == sourceHost.vlan && e != sourceHost).ToList();
            possibleDestHosts.Shuffle();
            var destHost = possibleDestHosts[0];

            //sourceHost.vlan

            int? vlan = null;

            if (sourceHost.AttachedToPort.IsVlanTagged(sourceHost.vlan))
            {
                vlan = sourceHost.vlan;
            }

            return new EthernetFrame(sourceHost, destHost.MAC,
                vlan,
                ContentsToUse[rand.Next(ContentsToUse.Count())]);
        }

        public static void RandomizeSwitchPortsVlan(SwitchEngine switchEngine)
        {
            int numOfUntaggedPorts = switchEngine.Count - 3;
            List<int> vlansNum = new List<int>();
            var rand = new Random();
            for(int i = 1; i < (numOfUntaggedPorts * 3); i += 3)
            {
                vlansNum.Add(rand.Next(i, i+3) * 10);
            }

            var freePorts = new List<SwitchPort>();
            switchEngine.ToList().ForEach(i => freePorts.Add(i));

            freePorts.Shuffle();
            var a = 0;
            foreach(var n in vlansNum)
            {
                freePorts[a].Untagged.Clear();
                freePorts[a].Untagged.Add(n);
                a++;
            }
            var b = 0;
            foreach (var n in vlansNum)
            {
                freePorts[a].Untagged.Clear();
                freePorts[a].Untagged.Add(n);
                a++;
                b++;
                if (b == 2) break;
            }
            freePorts[switchEngine.Count - 2].Untagged.Clear();
            freePorts[switchEngine.Count - 2].Tagged.Clear();
            foreach (var n in vlansNum)
            {
                freePorts[switchEngine.Count - 2].Tagged.Add(n);
            }
            b = 0;
            freePorts[switchEngine.Count - 1].Untagged.Clear();
            freePorts[switchEngine.Count - 1].Untagged.Add(vlansNum[0]);
            foreach(var n in vlansNum)
            {
                if(vlansNum[0] != n)
                {
                    freePorts[switchEngine.Count - 1].Tagged.Add(n);
                }
                b++;
                if (b == 2) break;
            }
        }

    }
}
