using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Navigation;
using System.Windows.Shapes;

namespace BeARouter
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();

            var eths = new RouterPorts();
            var numOfPorts = 5;
            for(int a = 0; a < numOfPorts; a ++)
            {
                eths.Add(a, new RouterPort(a));   
            }
            for(int a = 0; a < numOfPorts; a++)
            {
                eths[a].AttachToGrid(mainGrid, 10, 20 + a * 105);
            }

            var routingTable = new RoutingTable();

            var ipv4Address_eth0 = new Subnet("192.168.1.1", 24);
            eths[0].ipv4Addresses.Add(ipv4Address_eth0);

            var remote1 = new Subnet("10.0.0.0", 8);

            routingTable.Add(new Route(remote1, eths[0], gateway: ipv4Address_eth0.IpAddress));
            routingTable.Add(new Route(ipv4Address_eth0.ToNetaddr(), eths[0], src: ipv4Address_eth0.IpAddress));


            textBoxIpRoute.Text = routingTable.ToString();

            textBoxIpAddress.Text = eths.ToString();

            var ipv4Packet = new IPv4Packet("A","B", new IPv4Address("192.168.1.3"), new IPv4Address("192.168.2.10"));

            ipv4Packet.AttachToGrid(mainGrid, 460, 215);
        }
    }
}
