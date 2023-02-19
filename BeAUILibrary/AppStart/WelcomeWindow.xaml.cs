using BeAUILibrary.AppStart;
using System;
using System.Collections.Generic;
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
using System.Windows.Shapes;
using static BeAUILibrary.AppStart.WelcomeWindow;

namespace BeAUILibrary.AppStart
{
    /// <summary>
    /// Interaction logic for WelcomeWindow.xaml
    /// </summary>
    public partial class WelcomeWindow : Window
    {
        public delegate void Next1Delegate(AppTypes selectedApp, InstanceSettings settings);
        public Next1Delegate next1Delegate;

        public delegate void Next2Delegate(bool examMode, int numOfCorrectAttempts, int totalNumberOfAttempts);
        public Next2Delegate next2Delegate;

        private SelectAppPage selectAppPage;
        private BeASwitchOptionsPage beASwitchOptionsPage;
        private AppTypes SelectedApp;
        private SelectModePage selectModePage;

        IWelcomeUserConfig SelectedWindow;
        private InstanceSettings instanceSettings;
        private readonly Dictionary<AppTypes, IWelcomeUserConfig> appTypeToWindow;

        bool finalApplicationStarted = false;

        public WelcomeWindow(Dictionary<AppTypes, IWelcomeUserConfig> appTypeToWindow)
        {
            InitializeComponent();

            next1Delegate = Next1;
            next2Delegate = Next2;

            selectAppPage = new SelectAppPage(next1Delegate);

            beASwitchOptionsPage = new BeASwitchOptionsPage(next1Delegate);

            if (appTypeToWindow.ContainsKey(AppTypes.BeASwitch))
            {
                this.Title = "BeASwitch";
                mainFrame.Content = beASwitchOptionsPage;
            }
            else
            {
                mainFrame.Content = selectAppPage;
            }

            
            this.Title += $" {Assembly.GetEntryAssembly().GetName().Version}";
            this.appTypeToWindow = appTypeToWindow;
        }

        public void Next1(AppTypes selectedApp, InstanceSettings settings)
        {
            SelectedApp = selectedApp;

            selectModePage = new SelectModePage(next2Delegate);

            mainFrame.Content = selectModePage;

            this.instanceSettings = settings;
        }

        public void Next2(bool examMode, int numOfCorrectAttempts, int totalNumberOfAttempts)
        {
            SelectedWindow = appTypeToWindow[SelectedApp];

            instanceSettings.ExamMode = examMode;
            instanceSettings.NumOfCorrectAttempts = numOfCorrectAttempts;
            instanceSettings.TotalNumberOfAttempts = totalNumberOfAttempts;

            SelectedWindow.SetUserWelcomeConfig(instanceSettings);
            
            if(SelectedWindow is Window)
            {
                ((Window)SelectedWindow).Show();
                finalApplicationStarted = true;
            }
            Close();
        }

        private void mainFrame_Navigated(object sender, System.Windows.Navigation.NavigationEventArgs e)
        {
            mainFrame.NavigationService.RemoveBackEntry();
        }

        private void Window_Closed(object sender, EventArgs e)
        {
            if(!finalApplicationStarted)
            {
                Application.Current.Shutdown();
            }
        }
    }
}
