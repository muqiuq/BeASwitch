using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows.Threading;

namespace BeARouter
{
    public class GameEngine
    {
        public GameState State { get; set; } = GameState.NEW;

        public RoutingTable RoutingTable { get; private set; } = new RoutingTable();
        public RouterPorts Ports { get; private set; } = new RouterPorts();

        internal IPv4Packet CurrentPacket;

        public int NumberOfCorrectAttempts = 0;
        public int NumberOfAttempts = 0;

        public const int NUMBER_OF_INTERFACES = 5;
        public const int NUMBER_OF_ROUTES = 4;
        private readonly Dispatcher dispatcher;
        private readonly int numberOfInterfaces;

        internal Route LastUsedRoute { get; set; }

        private readonly string ownMAC;

        private List<IPv4Address> listOfAddrInNearbySubnetsAndAFewRandomPublicIPs = new List<IPv4Address>();

        public GameEngine(Dispatcher dispatcher, int numberOfInterfaces = NUMBER_OF_INTERFACES)
        {
            var randomAddresses = GenerateRandomInterfaceAddresses(numberOfInterfaces);

            for (int a = 0; a < numberOfInterfaces; a++)
            {
                var rp = new RouterPort(a);
                rp.AddIPv4Address(randomAddresses[a]);
                Ports.Add(a, rp);
            }

            RoutingTable = GenerateRandomRoutingTableAndAddConnectedRoutes(NUMBER_OF_ROUTES, Ports);
            this.dispatcher = dispatcher;
            this.numberOfInterfaces = numberOfInterfaces;
            this.ownMAC = Helper.GenerateRandomMAC();

            foreach (var route in RoutingTable)
            {
                if (route.IsDefaultRoute()) continue;
                var hostAddr = route.Subnet.GetHostMin().GetAddress();
                var skip = 1;
                var upperRandValue = 30 - route.Subnet.Mask;
                var lowerRandValue = 1;
                if (route.Subnet.Mask < 24)
                {
                    lowerRandValue = 4 + (24 - route.Subnet.Mask);
                }
                Random r = new Random();
                while (hostAddr.CompareTo(route.Subnet.GetBroadcast()) > 0)
                {
                    listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.Add(hostAddr);
                    hostAddr = hostAddr.IncrementBy(skip);
                    skip += r.Next(lowerRandValue, upperRandValue);
                }
            }

            var numberOfPublicIPAddressToAdd = listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.Count / 10 + 10;
            for (int a = 0; a < numberOfPublicIPAddressToAdd; a++)
            {
                var randAddr = GetRandomPublicIPv4Subnet().GetAddress();
                if (!listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.Contains(randAddr))
                {
                    listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.Add(randAddr);
                }
            }

            Random rand = new Random();
            var numberOfMixes = listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.Count * 30;
            for (int a = 0; a < numberOfMixes; a++)
            {
                var index = rand.Next(0, listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.Count - 1);
                var value = listOfAddrInNearbySubnetsAndAFewRandomPublicIPs[index];
                listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.RemoveAt(index);
                listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.Add(value);
            }

        }

        private delegate Subnet GenerateIPv4AddressDelegate();

        public static RoutingTable GenerateRandomRoutingTableAndAddConnectedRoutes(int numberOfEntries, RouterPorts routerPorts)
        {
            if (numberOfEntries <= 1) numberOfEntries = 2;
            var randomSubnets = GenerateRandomInterfaceAddresses(numberOfEntries - 1);
            randomSubnets.Add(new Subnet(new IPv4Address("0.0.0.0"), 0));

            var routingTable = new RoutingTable();

            Random rand = new Random();

            Dictionary<RouterPort, int> routerPortToHostCount = new Dictionary<RouterPort, int>();

            new List<RouterPort>(routerPorts).ForEach(i =>
            {
                routerPortToHostCount.Add(i, 1);
                var intAddr = i.GetFirstAddress();
                routingTable.Add(new Route(intAddr.GetNetSubnet(), i, src: intAddr.GetAddress()));
            }
            );

            var newOverlappSubnetStep = new Subnet(randomSubnets[0].GetAddress(), randomSubnets[0].Mask - 1);
            var newOverlappSubnet = new Subnet(newOverlappSubnetStep.GetNetAddress().IncrementOne(), newOverlappSubnetStep.Mask);
            randomSubnets.Add(newOverlappSubnet);
            randomSubnets[0] = randomSubnets[0].GenerateNewWithLowestBitWithinMaskIncreased();

            for (var a = 0; a < randomSubnets.Count; a++)
            {
                var randomRouterPort = routerPorts[rand.Next(0, routerPorts.Count)];
                var intAddr = randomRouterPort.GetFirstAddress().GetAddress();
                for (int b = 0; b < routerPortToHostCount[randomRouterPort]; b++)
                {
                    intAddr = intAddr.IncrementOne();
                }
                routerPortToHostCount[randomRouterPort] += 1;
                routingTable.Add(new Route(randomSubnets[a].GetNetSubnet(), randomRouterPort, intAddr));
            }

            return routingTable;
        }

        private static Subnet GetRandomPublicIPv4Subnet()
        {
            return Helper.GetRandomPublicIPv4Subnet();
        }

        public static List<Subnet> GenerateRandomInterfaceAddresses(int numberOfAddresses)
        {
            var rand = new Random();

            int numberOf192addresses = rand.Next(1, 3);
            int numberOf10addresses = rand.Next(1, 3);
            int numberOfPublicAddresses = numberOfAddresses - numberOf10addresses - numberOf192addresses;


            var listOfGenerators = new List<GenerateIPv4AddressDelegate>();

            for (int a = 0; a < numberOf192addresses; a++)
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
                        rand.Next(14, 28));
                });
            }
            for (int a = 0; a < numberOfPublicAddresses; a++)
            {
                listOfGenerators.Add(GetRandomPublicIPv4Subnet);
            }

            var listOfSubnets = new List<Subnet>();

            while (listOfSubnets.Count < numberOfAddresses)
            {
                var generator = listOfGenerators[0];
                var subnet = generator();
                if (!listOfSubnets.Any(s => s.GetNetAddress() == subnet.GetNetAddress()))
                {
                    if (!subnet.IsHostAddress())
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

        private int _currentPosRandomIPv4 = 0;
        private int currentPosRandomIPv4
        {
            get
            {
                return _currentPosRandomIPv4;
            }
            set
            {
                _currentPosRandomIPv4 = value % listOfAddrInNearbySubnetsAndAFewRandomPublicIPs.Count;
            }
        }

        public bool AreAllAttemptsCorrect
        {
            get
            {
                return NumberOfAttempts == NumberOfCorrectAttempts;
            }
        }

        public bool LastAttemptCorrect { get; private set; }

        public IPv4Packet NextPacket()
        {
            State = GameState.USERINPUT;
            Random r = new Random();
            //TODO: Fix source and dest IP could correspond to the same subnet
            var randomIndexSource = currentPosRandomIPv4;
            currentPosRandomIPv4++;
            var randomIndexDest = currentPosRandomIPv4;
            currentPosRandomIPv4++;
            CurrentPacket = new IPv4Packet(sourceMAC: Helper.GenerateRandomMAC(),
                destMAC: ownMAC,
                sourceIP: listOfAddrInNearbySubnetsAndAFewRandomPublicIPs[randomIndexSource],
                destIP: listOfAddrInNearbySubnetsAndAFewRandomPublicIPs[randomIndexDest]);

            return CurrentPacket;
        }

        public void CheckSolution()
        {
            State = GameState.SOLUTIONSHOW;
            LastUsedRoute = RoutingTable.GetRouteFor(CurrentPacket.DestIP);
            dispatcher.Invoke(() =>
            {
                LastUsedRoute.RouterPort.MarkForSend();
            });

            LastAttemptCorrect = false;
            var AllCorrect = true;
            var theOneIsCorrect = false;

            foreach (var routerPort in Ports)
            {
                if (routerPort.IsChecked && routerPort.IsMarked)
                {
                    theOneIsCorrect = true;
                }
                if (routerPort.IsChecked && !routerPort.IsMarked)
                {
                    LastAttemptCorrect = true;
                    AllCorrect = false;
                }
            }
            if(AllCorrect && theOneIsCorrect)
            {
                NumberOfCorrectAttempts++;
            } 
            NumberOfAttempts++;
        }

        public void ClearBoard()
        {
            Ports.ToList().ForEach(i =>
            {
                i.ClearCheckBoxes();
                i.ClearMarks();
            });
        }

    }
}
