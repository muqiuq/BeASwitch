using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
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

namespace BeASwitch
{
    /// <summary>
    /// Interaction logic for MainWindow.xaml
    /// </summary>
    public partial class MainWindow : Window
    {
        SwitchEngine switchEngine;
        GameEngine gameEngine;

        bool currentFrameChecked = false;

        public MainWindow(InstanceSettings settings)
        {
            InitializeComponent();

            switchEngine = new SwitchEngine(6);
            if(settings.UseVLAN)
            {
                GameEngine.RandomizeSwitchPortsVlan(switchEngine);
            }
            gameEngine = new GameEngine(switchEngine);

            switchEngine[0].AttachToGrid(mainGrid, 10, 10, settings.UseVLAN);
            switchEngine[1].AttachToGrid(mainGrid, 10, 180, settings.UseVLAN);
            switchEngine[2].AttachToGrid(mainGrid, 10, 350, settings.UseVLAN);
            switchEngine[3].AttachToGrid(mainGrid, 600, 10, settings.UseVLAN);
            switchEngine[4].AttachToGrid(mainGrid, 600, 180, settings.UseVLAN);
            switchEngine[5].AttachToGrid(mainGrid, 600, 350, settings.UseVLAN);

            this.Title += $" {Assembly.GetEntryAssembly().GetName().Version}";
        }

        private void Ellipse1_MouseMove(object sender, MouseEventArgs e)
        {
            if(e.LeftButton == MouseButtonState.Pressed)
            {
                // DragDrop.DoDragDrop(rectangle1, rectangle1.Fill.ToString(), DragDropEffects.Move);
            }
            if(e.LeftButton == MouseButtonState.Released)
            {

            }
        }

        private Brush _previousFill = null;

        public EthernetFrame CurrentEthernetFrame { get; private set; }

        private void rectangleDest1_DragEnter(object sender, DragEventArgs e)
        {
            Rectangle ellipse = sender as Rectangle;
            if (ellipse != null)
            {
                // Save the current Fill brush so that you can revert back to this value in DragLeave.
                _previousFill = ellipse.Fill;

                // If the DataObject contains string data, extract it.
                if (e.Data.GetDataPresent(DataFormats.StringFormat))
                {
                    string dataString = (string)e.Data.GetData(DataFormats.StringFormat);

                    // If the string can be converted into a Brush, convert it.
                    BrushConverter converter = new BrushConverter();
                    if (converter.IsValid(dataString))
                    {
                        Brush newFill = (Brush)converter.ConvertFromString(dataString);
                        ellipse.Fill = newFill;
                    }
                }
            }
        }

        private void rectangleDest1_DragLeave(object sender, DragEventArgs e)
        {
            Rectangle ellipse = sender as Rectangle;
            if (ellipse != null)
            {
                ellipse.Fill = _previousFill;
            }
        }


        GameState nextState = GameState.NEW;
        UserScore userScore = new UserScore();

        private void buttonCheckClick(object sender, RoutedEventArgs e)
        {
            if(nextState == GameState.NEW || nextState == GameState.USERINPUT)
            {
                buttonCheck.Content = "Check solution";
                nextState = GameState.SOLUTIONSHOW;
                if (CurrentEthernetFrame != null) CurrentEthernetFrame.DetachFromSwitchPort();
                CurrentEthernetFrame = gameEngine.RandomEthernetFrame(switchEngine);
                CurrentEthernetFrame.AttachPackageToSwitchPort(CurrentEthernetFrame.SourceHost.AttachedToPort);
                currentFrameChecked = false;
                switchEngine.ClearAllPorts();
                textBlockAction.Text = "";
                textBlockPoints.Text = $"\n{userScore}";
            }
            else if(nextState == GameState.SOLUTIONSHOW)
            {
                buttonCheck.Content = "Next frame";
                nextState = GameState.USERINPUT;
                if (CurrentEthernetFrame != null)
                {
                    var action = switchEngine.ProcessEthernetFrame(CurrentEthernetFrame);
                    Debug.WriteLine(action);
                    textBlockAction.Text = action.ToString();
                    textBoxMacTables.Text = switchEngine.GetMacTablesAsPrettyString();
                    currentFrameChecked = true;
                    var tagAndSendDecision = switchEngine.GetTagAndSendDecisions(action.VLANID);
                    string solutionsStr = "";
                    if (action.Type == SwitchActionType.BROADCAST)
                    {
                        foreach (var port in switchEngine)
                        {
                            if (port == action.Frame.SourceHost.AttachedToPort) continue;
                            if (tagAndSendDecision.SendToPort(port))
                            {
                                port.MarkForSend();
                                solutionsStr += $"S{port.Num}";
                            }
                            if (tagAndSendDecision.TagForPort(port))
                            {
                                port.MarkForTag();
                                solutionsStr += $"T{port.Num}";
                            }
                        }
                    }
                    if (action.Type == SwitchActionType.UNICAST)
                    {
                        action.DestPort.MarkForSend();
                        solutionsStr += $"S{action.DestPort.Num}";
                        if (tagAndSendDecision.TagForPort(action.DestPort))
                        {
                            action.DestPort.MarkForTag();
                            solutionsStr += $"T{action.DestPort.Num}";
                        }
                    }
                    string userInput = "";
                    foreach (var port in switchEngine)
                    {
                        if (port.CheckBoxSend.IsChecked.Value)
                        {
                            userInput += $"S{port.Num}";
                        }
                        if (port.CheckBoxTag.IsChecked.Value)
                        {
                            userInput += $"T{port.Num}";
                        }
                    }
                    Debug.WriteLine($"Correct is {solutionsStr} and user answered {userInput}");
                    if (solutionsStr == userInput)
                    {
                        Debug.WriteLine("User answered correctly");
                        userScore.CorrectAnswer();
                        textBlockPoints.Text = "Correct!";

                    }
                    else
                    {
                        Debug.WriteLine("User answered wrong");
                        userScore.WrongAnswer();
                        textBlockPoints.Text = "Wrong!";
                    }
                    textBlockPoints.Text += $"\n{userScore}";
                }
            }
        }

        private void buttonClearMacTable_Click(object sender, RoutedEventArgs e)
        {
            switchEngine.ClearMacAddressTables();
            textBoxMacTables.Text = "MAC address tables are empty.";
        }
    }
}
