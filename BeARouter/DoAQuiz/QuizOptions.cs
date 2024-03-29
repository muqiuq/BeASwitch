﻿using BeAToolsLibrary;
using System;
using System.Collections.Generic;
using System.Text;

namespace BeARouter.DoAQuiz
{
    public class QuizOptions
    {
        private Goal goal = new Goal(30, 29);
        public Goal Goal
        {
            get => goal; set
            {
                ChangedOption = true;
                goal = value;
            }
        }
        private bool _iPv4Questions = true;
        public bool IPv4Questions
        {
            get
            {
                return _iPv4Questions;
            }
            set
            {
                _iPv4Questions = value;
                ChangedOption = true;
            }
        }

        private bool _iPv6Questions = true;
        public bool IPv6Questions
        {
            get
            {
                return _iPv6Questions;
            }
            set
            {
                _iPv6Questions = value;
                ChangedOption = true;
            }
        }

        public bool ChangedOption = false;

        public void ResetChangeTracker()
        {
            ChangedOption = false;
        }

        public bool IsQuestionCategoryActive(QuestionCategory questionCategory)
        {
            if (QuestionCategory.IPv4 == questionCategory && IPv4Questions) return true;
            if (QuestionCategory.IPv6 == questionCategory && IPv6Questions) return true;
            return false;
        }
    }
}
