using BeAToolsLibrary;
using BeAUILibrary;
using BeAUILibrary.AppStart;
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
    public partial class MainWindow : Window, IWelcomeUserConfig
    {
        SwitchEngine switchEngine;
        private double originalWindowWidth;
        private double originalWindowHeight;
        GameEngine gameEngine;
        InstanceSettings settings;

        bool currentFrameChecked = false;


        public MainWindow()
        {
            InitializeComponent();

            switchEngine = new SwitchEngine(6);

            originalWindowWidth = this.Width;
            originalWindowHeight = this.Height;

            this.Title += $" {Assembly.GetEntryAssembly().GetName().Version}";
        }

        public void SetUserWelcomeConfig(InstanceSettings settings)
        {
            this.settings = settings;
            if (settings.UseVLAN)
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
            if(settings.ExamMode)
            {
                goal = new Goal(settings.TotalNumberOfAttempts, settings.NumOfCorrectAttempts);
            }

            gameEngine.EthernetHosts.ForEach(eh => comboBoxMac.Items.Add(eh.MAC));
            switchEngine.ToList().ForEach(sp => comboBoxPort.Items.Add(sp.Num));
            enableMacEntrySection(false);
            labelMacCorrect.Visibility = Visibility.Hidden;
            labelPortCorrect.Visibility = Visibility.Hidden;
            radioButtonEntryNotRequired.IsEnabled = false;
            radioButtonEntryRequired.IsEnabled = false;
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
        private Goal goal;
        

        private void updateUserScoreUI()
        {
            textBlockPoints.Text += $"\n{userScore}";
            if (settings.ExamMode)
            {
                textBlockPoints.Text += $" Goal: {goal}";
            }
        }

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
                textBlockPoints.Text = "";
                labelMacCorrect.Visibility = Visibility.Hidden;
                labelPortCorrect.Visibility = Visibility.Hidden;
                radioButtonEntryRequired.Foreground = Brushes.Black;
                radioButtonEntryNotRequired.Foreground = Brushes.Black;
                radioButtonEntryNotRequired.IsChecked = false;
                radioButtonEntryRequired.IsChecked = false;
                radioButtonEntryNotRequired.IsEnabled = true;
                radioButtonEntryRequired.IsEnabled = true;
                radioButtonEntryRequired.FontWeight = FontWeights.Normal;
                radioButtonEntryNotRequired.FontWeight = FontWeights.Normal;
                enableMacEntrySection(false);
                buttonCheck.IsEnabled = false;
                comboBoxMac.SelectedIndex = -1;
                comboBoxPort.SelectedIndex = -1;
                updateUserScoreUI();
            }
            else if(nextState == GameState.SOLUTIONSHOW)
            {
                buttonCheck.Content = "Next frame";
                nextState = GameState.USERINPUT;
                if (CurrentEthernetFrame != null)
                {
                    var macEntryUserInputValidationResult = ValidateMacEntryUserInput();
                    var action = switchEngine.ProcessEthernetFrame(CurrentEthernetFrame);
                    Debug.WriteLine(action);
                    textBlockAction.Text = action.ToString();
                    var macTableStrings = Helper.SplitMultilineText(switchEngine.GetMacTablesAsPrettyString(), 18);
                    textBoxMacTablesLeft.Text = macTableStrings.Item1;
                    textBoxMacTablesRight.Text = macTableStrings.Item2;
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
                    if (solutionsStr == userInput && macEntryUserInputValidationResult)
                    {
                        Debug.WriteLine("User answered correctly");
                        userScore.AddCorrectAnswer();
                        textBlockPoints.Text = "Correct!";
                    }
                    else
                    {
                        Debug.WriteLine("User answered wrong");
                        userScore.AddWrongAnswer();
                        textBlockPoints.Text = "Wrong!";
                    }
                    updateUserScoreUI();

                    if(goal != null)
                    {
                        if (goal.IsGoalReached(userScore.CorrectAnswers, userScore.TotalAnswers) && settings.ExamMode)
                        {
                            var successWindow = new SuccessCertificateWindow(new Goal(userScore.TotalAnswers, userScore.CorrectAnswers), $"BeASwitch,VLAN:{settings.UseVLAN}");
                            successWindow.ShowDialog();
                            RestartGame();
                            return;
                        }
                        else if (!goal.CanGoalBeReached(userScore.CorrectAnswers, userScore.TotalAnswers) && settings.ExamMode)
                        {
                            MessageBox.Show("You have made too many mistakes and can no longer achieve your set goal. The game will now restart. ", "Goal can't be reached", MessageBoxButton.OK, MessageBoxImage.Error);
                            RestartGame();
                            return;
                        }
                    }
                }
            }
        }

        private bool ValidateMacEntryUserInput()
        {
            var answeredCorrectly = true;
            var entryRequired = switchEngine.IsMacTableEntryRequiredForFrame(CurrentEthernetFrame);
            if (radioButtonEntryRequired.IsChecked.Value != entryRequired)
            {
                answeredCorrectly = false;
            }
            radioButtonEntryRequired.Foreground = entryRequired ? Brushes.DarkGreen : Brushes.Black;
            radioButtonEntryRequired.FontWeight = entryRequired ? FontWeights.Bold : FontWeights.Normal;
            radioButtonEntryNotRequired.Foreground = !entryRequired ? Brushes.DarkGreen : Brushes.Black;
            radioButtonEntryNotRequired.FontWeight = !entryRequired ? FontWeights.Bold : FontWeights.Normal;

            if (entryRequired)
            {

                var userInputMac = comboBoxMac.SelectedItem != null ? comboBoxMac.SelectedItem.ToString().ToUpper() : "";
                var userInputPort = comboBoxPort.SelectedItem != null ? comboBoxPort.SelectedItem.ToString().ToUpper() : "";

                if (userInputMac == CurrentEthernetFrame.SourceHost.MAC)
                {
                    labelMacCorrect.Foreground = Brushes.DarkGreen;
                    labelMacCorrect.Content = "Correct";
                }
                else
                {
                    labelMacCorrect.Foreground = Brushes.Red;
                    labelMacCorrect.Content = $"Incorrect => Correct: {CurrentEthernetFrame.SourceHost.MAC}";
                    answeredCorrectly = false;
                }
                if (userInputPort == CurrentEthernetFrame.AttachedCurrentlyToSwitchPort.Num.ToString())
                {
                    labelPortCorrect.Foreground = Brushes.DarkGreen;
                    labelPortCorrect.Content = "Correct";
                }
                else
                {
                    labelPortCorrect.Foreground = Brushes.Red;
                    labelPortCorrect.Content = $"Incorrect => Correct: {CurrentEthernetFrame.AttachedCurrentlyToSwitchPort.Num}";
                    answeredCorrectly = false;
                }
                labelPortCorrect.Visibility = Visibility.Visible;
                labelMacCorrect.Visibility = Visibility.Visible;
            }
            radioButtonEntryNotRequired.IsEnabled = false;
            radioButtonEntryRequired.IsEnabled = false;
            return answeredCorrectly;
        }

        private void radioButtonMacEntryChanged(object sender, RoutedEventArgs e)
        {
            var macAdrressEntryRequired = radioButtonEntryRequired.IsChecked.HasValue && radioButtonEntryRequired.IsChecked.Value;
            enableMacEntrySection(macAdrressEntryRequired);
            if(radioButtonEntryNotRequired.IsChecked.HasValue)
            {
                buttonCheck.IsEnabled = radioButtonEntryNotRequired.IsChecked.Value;
            }
        }

        private void enableMacEntrySection(bool macAdrressEntryRequired)
        {
            comboBoxMac.IsEnabled = macAdrressEntryRequired;
            comboBoxPort.IsEnabled = macAdrressEntryRequired;
            labelNewEntry.Opacity = macAdrressEntryRequired ? 1 : 0.5;
            labelMac.Opacity = macAdrressEntryRequired ? 1 : 0.5;
            labelPort.Opacity = macAdrressEntryRequired ? 1 : 0.5;
        }

        private void RestartGame()
        {
            clearMacAddressTable();
            userScore.Reset();
            if (CurrentEthernetFrame != null) CurrentEthernetFrame.DetachFromSwitchPort();
            switchEngine.ClearAllPorts();
            textBlockAction.Text = "";
            textBlockPoints.Text = "";
            buttonCheck.Content = "Start";
            nextState = GameState.NEW;
            buttonCheck.IsEnabled = true;
            updateUserScoreUI();
        }

        private void clearMacAddressTable()
        {
            switchEngine.ClearMacAddressTables();
            textBoxMacTablesLeft.Text = "MAC address tables are empty.";
        }

        private void buttonRestartGame_Click(object sender, RoutedEventArgs e)
        {
            var messageBox = MessageBox.Show("Are you sure you want to restart the game and loose your progress?", "Restart game", MessageBoxButton.YesNo, MessageBoxImage.Warning, MessageBoxResult.No);
            if (messageBox == MessageBoxResult.Yes)
            {
                RestartGame();
            }
            
        }

        private void buttonCheckAll_Click(object sender, RoutedEventArgs e)
        {
            switchEngine.MarkAllExceptInboundPort(CurrentEthernetFrame);
        }

        private void comboBoxSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if(radioButtonEntryRequired.IsChecked.HasValue && radioButtonEntryRequired.IsChecked.Value)
            {
                buttonCheck.IsEnabled = comboBoxMac.SelectedItem != null && comboBoxPort.SelectedItem != null;
            }
        }


    }
}
