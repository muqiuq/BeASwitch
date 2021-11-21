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
        GameEngine gameEngine = new GameEngine();

        public MainWindow()
        {
            InitializeComponent();

            pointsGrid.Visibility = Visibility.Hidden;

            for (int a = 0; a < gameEngine.Ports.Count; a++)
            {
                gameEngine.Ports[a].AttachToGrid(mainGrid, 10, 20 + a * 105);
            }

            textBoxIpRoute.Text = gameEngine.RoutingTable.ToString();

            textBoxIpAddress.Text = gameEngine.Ports.ToString();

            /*var ipv4Packet = new IPv4Packet("A","B", new IPv4Address("192.168.1.3"), new IPv4Address("192.168.2.10"));

            ipv4Packet.AttachToGrid(mainGrid, 460, 215);*/

            updateMainButton();
        }

        public void UpdateAll()
        {
            if(!CheckAccess())
            {
                Dispatcher.Invoke(() => UpdateAll());
                return;
            }
            updateMainButton();
        }

        private void updateMainButton()
        {
            if(gameEngine.State == GameState.NEW)
            {
                masterButton.Content = "Start";
            }
            else if(gameEngine.State == GameState.USERINPUT)
            {
                masterButton.Content = "&lt;&#xD;&#xA;&lt;&#xD;&#xA;Send&#xD;&#xA;&lt;&#xD;&#xA;&lt;";
            }
            else if (gameEngine.State == GameState.SOLUTIONSHOW)
            {
                masterButton.Content = "&gt;&#xD;&#xA;&gt;&#xD;&#xA;Next&#xD;&#xA;&gt;&#xD;&#xA;&gt;";
            }
        }
    }
}
