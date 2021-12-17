using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;

namespace BeARouter
{
    /// <summary>
    /// Interaction logic for ExplainWindow.xaml
    /// </summary>
    public partial class ExplainWindow : Window
    {
        private readonly GameEngine gameEngine;

        public ExplainWindow(GameEngine gameEngine)
        {
            this.gameEngine = gameEngine;

            InitializeComponent();

            Update();
        }

        private void Append(string line)
        {
            InfoBox.AppendText(line + "\n");
        }

        public void Update()
        {
            if (!CheckAccess())
            {
                Dispatcher.Invoke(() => Update());
                return;
            }

            InfoBox.Text = "";

            var selectedRoute = gameEngine.LastUsedRoute;
            var currentIPv4Packet = gameEngine.CurrentPacket;

            if(selectedRoute != null && currentIPv4Packet != null && gameEngine.State == GameState.SOLUTIONSHOW)
            {
                var routeMatchResults = gameEngine.RoutingTable.MatchAllRoutesForIPv4(currentIPv4Packet.DestIP);

                Append(string.Format(DefaultTexts.EXPLAIN_DEST_IP, currentIPv4Packet.DestIP));
                Append("");

                foreach (var routeMatchResult in routeMatchResults)
                {
                    Append(string.Format(DefaultTexts.ROUTE_EXPLAIN_LINE,
                        routeMatchResult.Route.Subnet,
                        routeMatchResult.Route.Subnet.Mask,
                        routeMatchResult.CalculatedNetAddress.GetNetAddress(),
                        routeMatchResult.Matches ? DefaultTexts.MATCH : DefaultTexts.NO_MATCH,
                        currentIPv4Packet.DestIP));
                }

                Append("");
                Append(string.Format(DefaultTexts.ROUTE_NUM_MATCHES, routeMatchResults.Count(i => i.Matches)));
                Append("");
                Append(string.Format(DefaultTexts.ROUTE_DECISION, selectedRoute, selectedRoute.Subnet.Mask));
            }
        }
    }
}
