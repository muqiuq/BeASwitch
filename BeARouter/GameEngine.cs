using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace BeARouter
{
    public class GameEngine
    {
        public GameState State { get; set; } = GameState.NEW;

        public RoutingTable RoutingTable { get; private set; } = new RoutingTable();
        public RouterPorts Ports { get; private set; } = new RouterPorts();

        IPv4Packet currentPacket;

        public int numberOfCorrectAttemts = 0;
        public int numberOfAttemts = 0;

        public const int NUMBER_OF_INTERFACES = 5;

        private readonly int numberOfInterfaces;

        public GameEngine(int numberOfInterfaces = NUMBER_OF_INTERFACES)
        {
            var randomAddresses = GenerateRandomInterfaceAddresses(numberOfInterfaces);

            for(int a = 0; a < numberOfInterfaces; a++)
            {
                var rp = new RouterPort(a);
                rp.AddIPv4Address(randomAddresses[a]);
                Ports.Add(a, rp);
            }

            RoutingTable = GenerateRandomRoutingTableAndAddConnectedRoutes(3, Ports);

            this.numberOfInterfaces = numberOfInterfaces;
        }

        private delegate Subnet GenerateIPv4AddressDelegate();

        public static RoutingTable GenerateRandomRoutingTableAndAddConnectedRoutes(int numberOfEntries, RouterPorts routerPorts)
        {
            var randomSubnets = GenerateRandomInterfaceAddresses(numberOfEntries);

            var routingTable = new RoutingTable();

            Random rand = new Random();

            Dictionary<RouterPort, int> routerPortToHostCount = new Dictionary<RouterPort, int>();

            new List<RouterPort>(routerPorts).ForEach(i => {
                routerPortToHostCount.Add(i, 1);
                var intAddr = i.GetFirstAddress();
                routingTable.Add(new Route(intAddr.GetNetSubnet(), i, src: intAddr.GetAddress()));
                }
            );

            for(var a = 0; a < numberOfEntries; a++)
            {
                var randomRouterPort = routerPorts[rand.Next(0, routerPorts.Count)];
                var intAddr = randomRouterPort.GetFirstAddress().GetAddress();
                for(int b = 0; b < routerPortToHostCount[randomRouterPort]; b++)
                {
                    intAddr = intAddr.IncrementOne();
                }
                routerPortToHostCount[randomRouterPort] += 1;
                routingTable.Add(new Route(randomSubnets[a].GetNetSubnet(), randomRouterPort, intAddr));
            }

            return routingTable;
        }

        public static List<Subnet> GenerateRandomInterfaceAddresses(int numberOfAddresses)
        {
            var rand = new Random();

            int numberOf192addresses = rand.Next(1, 3);
            int numberOf10addresses = rand.Next(1, 3);
            int numberOfPublicAddresses = numberOfAddresses - numberOf10addresses - numberOf192addresses;


            var listOfGenerators = new List<GenerateIPv4AddressDelegate>();

            for(int a = 0; a < numberOf192addresses; a++)
            {
                listOfGenerators.Add(() =>
                {
                    return new Subnet(
                        new IPv4Address($"192.168.{rand.Next(0, 255)}.{rand.Next(0, 254)}"),
                        rand.Next(18, 30));
                });
            }
            for (int a = 0; a < numberOf10addresses; a++)
            {
                listOfGenerators.Add(() =>
                {
                    return new Subnet(
                        new IPv4Address($"10.{rand.Next(0, 255)}.{rand.Next(0, 255)}.{rand.Next(0, 254)}"),
                        rand.Next(10, 28));
                });
            }
            for (int a = 0; a < numberOfPublicAddresses; a++)
            {
                listOfGenerators.Add(() =>
                {
                    var firstPart = rand.Next(0, 197);
                    if(firstPart == 10 || firstPart == 100 || firstPart == 127 || 
                       firstPart == 192 || firstPart == 172 || firstPart == 169)
                    {
                        firstPart += 1;
                    }

                    return new Subnet(
                        new IPv4Address($"{firstPart}.{rand.Next(0, 254)}.{rand.Next(0, 254)}.{rand.Next(0, 254)}"),
                        rand.Next(16, 28));
                });
            }
            
            var listOfSubnets = new List<Subnet>();

            while(listOfSubnets.Count < numberOfAddresses)
            {
                var generator = listOfGenerators[0];
                var subnet = generator();
                if(!listOfSubnets.Any(s => s.GetNetAddress() == subnet.GetNetAddress()))
                {
                    if(!subnet.IsHostAddress())
                    {
                        subnet = subnet.GetHostMin();
                    }
                    listOfGenerators.RemoveAt(0);
                    listOfGenerators.Add(generator);
                    listOfSubnets.Add(subnet);
                }
            }

            return listOfSubnets;
        }

        private void generateRandomPacket()
        {

        }



    }
}
