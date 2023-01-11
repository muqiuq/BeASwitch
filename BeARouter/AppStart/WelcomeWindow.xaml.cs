using BeARouter.AppStart;
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
using static BeARouter.AppStart.WelcomeWindow;

namespace BeARouter.AppStart
{
    /// <summary>
    /// Interaction logic for WelcomeWindow.xaml
    /// </summary>
    public partial class WelcomeWindow : Window
    {
        public delegate void Next1Delegate(AppTypes selectedApp);
        public Next1Delegate next1Delegate;

        public delegate void Next2Delegate(bool examMode, int numOfCorrectAttempts, int totalNumberOfAttempts);
        public Next2Delegate next2Delegate;

        private SelectAppPage selectAppPage;
        private AppTypes SelectedApp;
        private SelectModePage selectModePage;

        Window SelectedWindow;

        public WelcomeWindow()
        {
            InitializeComponent();

            next1Delegate = Next1;
            next2Delegate = Next2;

            selectAppPage = new SelectAppPage(next1Delegate);

            mainFrame.Content = selectAppPage;

            this.Title += $" {Assembly.GetEntryAssembly().GetName().Version}";
        }

        public void Next1(AppTypes selectedApp)
        {
            SelectedApp = selectedApp;

            selectModePage = new SelectModePage(next2Delegate);

            mainFrame.Content = selectModePage;
        }

        public void Next2(bool examMode, int numOfCorrectAttempts, int totalNumberOfAttempts)
        {
            if (SelectedApp == AppTypes.BeARouter)
            {
                SelectedWindow = new MainWindow(examMode, numOfCorrectAttempts, totalNumberOfAttempts);
            }
            else if (SelectedApp == AppTypes.IPQuiz)
            {
                SelectedWindow = new DoAQuizWindow(examMode, numOfCorrectAttempts, totalNumberOfAttempts);
            }
            SelectedWindow.Show();
            Close();
        }

        private void mainFrame_Navigated(object sender, System.Windows.Navigation.NavigationEventArgs e)
        {
            mainFrame.NavigationService.RemoveBackEntry();
        }
    }
}
