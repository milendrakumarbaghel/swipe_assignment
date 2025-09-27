import { useEffect, useMemo, useState } from 'react';
import { ConfigProvider, Layout, Tabs, Typography, message } from 'antd';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { selectSession, selectUi } from './store';
import IntervieweeTab from './features/interviewee/IntervieweeTab';
import InterviewerTab from './features/interviewer/InterviewerTab';
import WelcomeBackModal from './features/common/WelcomeBackModal';
import { hideWelcomeBack, setActiveTab, showWelcomeBack } from './store/uiSlice';
import {
  markWelcomeBackSeen,
  resetSessionState,
  resumeSessionThunk,
} from './store/sessionSlice';
import './App.css';

const { Header, Content } = Layout;
const { Title } = Typography;

function App() {
  const dispatch = useAppDispatch();
  const sessionState = useAppSelector(selectSession);
  const uiState = useAppSelector(selectUi);
  const [resumeLoading, setResumeLoading] = useState(false);

  useEffect(() => {
    if (
      sessionState.session &&
      sessionState.status !== 'completed' &&
      sessionState.status !== 'idle' &&
      !sessionState.welcomeBackPrompted
    ) {
      dispatch(showWelcomeBack());
    }
  }, [dispatch, sessionState.session, sessionState.status, sessionState.welcomeBackPrompted]);

  const handleTabChange = (key) => {
    dispatch(setActiveTab(key));
  };

  const welcomeModalVisible = uiState.welcomeBackVisible;

  const handleResumeInterview = async () => {
    if (!sessionState.session?.id) {
      dispatch(hideWelcomeBack());
      return;
    }

    try {
      setResumeLoading(true);
      await dispatch(resumeSessionThunk(sessionState.session.id)).unwrap();
      dispatch(markWelcomeBackSeen());
      dispatch(hideWelcomeBack());
      message.success('Resumed interview session');
    } catch (error) {
      message.error(error.message || 'Failed to resume session');
    } finally {
      setResumeLoading(false);
    }
  };

  const handleDiscardInterview = () => {
    dispatch(resetSessionState());
    dispatch(markWelcomeBackSeen());
    dispatch(hideWelcomeBack());
    message.info('Previous session cleared');
  };

  const tabItems = useMemo(
    () => [
      {
        key: 'interviewee',
        label: 'Interviewee',
        children: <IntervieweeTab />,
      },
      {
        key: 'interviewer',
        label: 'Interviewer',
        children: <InterviewerTab />,
      },
    ],
    []
  );

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1d4ed8',
          borderRadius: 8,
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Header
          style={{
            background: '#fff',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
          }}
        >
          <Title level={3} style={{ margin: 0 }}>
            AI Interview Assistant
          </Title>
        </Header>
        <Content style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
          <Tabs
            activeKey={uiState.activeTab}
            onChange={handleTabChange}
            items={tabItems}
            destroyInactiveTabPane={false}
          />
        </Content>
        <WelcomeBackModal
          visible={welcomeModalVisible}
          session={sessionState.session}
          timer={sessionState.timer}
          onResume={handleResumeInterview}
          onDiscard={handleDiscardInterview}
          confirmLoading={resumeLoading}
        />
      </Layout>
    </ConfigProvider>
  );
}

export default App;
