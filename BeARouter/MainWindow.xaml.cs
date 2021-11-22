using System;
using System.Collections.Generic;
using System.Diagnostics;
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
        GameEngine gameEngine;

        public MainWindow()
        {
            InitializeComponent();

            gameEngine = new GameEngine(Dispatcher);

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
            updatePoints();
        }

        private void updateMainButton()
        {
            if(gameEngine.State == GameState.NEW)
            {
                masterButton.Content = "Start";
            }
            else if(gameEngine.State == GameState.USERINPUT)
            {
                masterButton.Content = "<\r\n<\r\nSend\r\n<\r\n<";
            }
            else if (gameEngine.State == GameState.SOLUTIONSHOW)
            {
                masterButton.Content = ">\r\n>\r\nNext\r\n>\r\n>";
            }
        }

        private void updatePoints()
        {
            pointsText.Text = string.Format("{0}/{1}", gameEngine.NumberOfCorrectAttempts, gameEngine.NumberOfAttempts);
            if(gameEngine.AreAllAttemptsCorrect)
            {
                pointsRectangle.Fill = new SolidColorBrush(Colors.LightGreen);
            }
            else
            {
                pointsRectangle.Fill = new SolidColorBrush(Colors.LightYellow);
            }
        }



        private void masterButton_Click(object sender, RoutedEventArgs e)
        {
            if(gameEngine.State == GameState.NEW)
            {
                pointsGrid.Visibility = Visibility.Visible;
            }

            if(gameEngine.State == GameState.USERINPUT)
            {
                gameEngine.CheckSolution();
            }
            else if(gameEngine.State == GameState.SOLUTIONSHOW || gameEngine.State == GameState.NEW)
            {
                gameEngine.ClearBoard();
                if (gameEngine.CurrentPacket != null) gameEngine.CurrentPacket.RemoveFromGrid(mainGrid);

                var ipv4Package = gameEngine.NextPacket();

                ipv4Package.AttachToGrid(mainGrid, 460, 215);

                var route = gameEngine.RoutingTable.GetRouteFor(ipv4Package.DestIP);

                Debug.WriteLine(route);
            }
            UpdateAll();

        }
    }
}
