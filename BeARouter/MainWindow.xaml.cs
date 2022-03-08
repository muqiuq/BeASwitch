using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.Linq;
using System.Net.NetworkInformation;
using System.Reflection;
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
                gameEngine.Ports[a].AttachToGrid(mainGrid, 10, 80 + a * 105);
            }

            textBoxIpRoute.Text = gameEngine.RoutingTable.ToString();

            textBoxIpAddress.Text = gameEngine.Ports.ToString();

            UpdateAll();

            UniqueID = new UniqueID();

            textBlockUniqueID.Text = UniqueID.ToString();

            this.Title += $" {Assembly.GetEntryAssembly().GetName().Version}";
        }

        private void ListProcesses()
        {
            Process[] processCollection = Process.GetProcesses();
            foreach (Process p in processCollection)
            {
                var filepath = "N/A";
                try
                {
                    filepath = p.MainModule.FileName;
                }catch(Exception e) { }
                Debug.WriteLine($"{p.ProcessName} {filepath}");
            }
        }

        private void Screenshot()
        {
            var screenresolution = Helper.GetScreenResolution();
            using var bitmap = new Bitmap(screenresolution.Item1, screenresolution.Item2);
            using (var g = Graphics.FromImage(bitmap))
            {
                g.CopyFromScreen(0, 0, 0, 0,
                bitmap.Size, CopyPixelOperation.SourceCopy);
            }
            bitmap.Save("filename.jpg", ImageFormat.Jpeg);
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
            updateInfoText();

            explainWindow?.Update();
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

        private void updateInfoText()
        {
            if (gameEngine.State == GameState.NEW)
            {
                InfoText.Text = DefaultTexts.PRESS_START_TO_RECEIVE_FIRST_IPV4;
            }
            else if (gameEngine.State == GameState.USERINPUT)
            {
                InfoText.Text = string.Format(DefaultTexts.IPv4PACKET_DESCRIPTION, gameEngine.CurrentPacket.SourceIP, gameEngine.CurrentPacket.DestIP);
            }
            else if (gameEngine.State == GameState.SOLUTIONSHOW)
            {
                InfoText.Text = string.Format(DefaultTexts.IPv4PACKET_RESULT, 
                    gameEngine.LastAttemptCorrect ? DefaultTexts.CORRECT : DefaultTexts.WRONG, 
                    gameEngine.LastUsedRoute.Subnet);
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
                buttonQuiz.Visibility = Visibility.Hidden;
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

                ipv4Package.AttachToGrid(mainGrid, 460, 275);

                var route = gameEngine.RoutingTable.GetRouteFor(ipv4Package.DestIP);

                Debug.WriteLine(route);
            }
            UpdateAll();

        }

        private ExplainWindow explainWindow = null;
        private DoAQuizWindow doAQuizWindow;

        internal UniqueID UniqueID { get; }

        private void buttonExplainWindow_Click(object sender, RoutedEventArgs e)
        {
            if(explainWindow == null || explainWindow.IsVisible == false)
            {
                explainWindow = new ExplainWindow(gameEngine);

                explainWindow.Show();
            }
        }

        private void buttonQuiz_Click(object sender, RoutedEventArgs e)
        {
            if(doAQuizWindow == null || doAQuizWindow.Visibility == Visibility.Hidden)
            {
                doAQuizWindow = new DoAQuizWindow();

                doAQuizWindow.Show();
            }
            else if(doAQuizWindow != null && doAQuizWindow.Visibility != Visibility.Collapsed)
            {
                doAQuizWindow.Visibility = Visibility.Visible;
                doAQuizWindow.BringIntoView();
            }
            else if(doAQuizWindow != null && doAQuizWindow.Visibility!= Visibility.Visible)
            {
                doAQuizWindow.BringIntoView();
            }

            
        }
    }
}
