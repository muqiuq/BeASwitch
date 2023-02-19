using BeAUILibrary.AppStart;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace BeARouter
{
    public class Global
    {

        public static Dictionary<AppTypes, IWelcomeUserConfig> AppTypesToApplication = new Dictionary<AppTypes, IWelcomeUserConfig>()
        {
            {AppTypes.BeARouter, new MainWindow() },
            {AppTypes.IPQuiz, new DoAQuizWindow() },
        };

    }
}
