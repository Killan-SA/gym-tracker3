import { Image, HStack, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import type { RestActivityProps } from '../lib/restActivity';
const RestActivity = (props: RestActivityProps, environment: LiveActivityEnvironment) => {
  'widget';
  const finished = props.finished || environment.isStale;
  const color = environment.isLuminanceReduced ? '#FFFFFF' : '#4ADE80';
  const countdown = finished
    ? <Text modifiers={[font({ size: 24, weight: 'bold' }), foregroundStyle(color)]}>00:00</Text>
    : <Text timerInterval={{ lower: new Date(props.startedAt), upper: new Date(props.endTime) }} countsDown modifiers={[font({ size: 24, weight: 'bold' }), foregroundStyle(color)]} />;
  const compactTimer = finished
    ? <Text modifiers={[font({ size: 13 }), foregroundStyle(color)]}>00:00</Text>
    : <Text timerInterval={{ lower: new Date(props.startedAt), upper: new Date(props.endTime) }} countsDown modifiers={[font({ size: 13 }), foregroundStyle(color)]} />;
  return {
    banner: <HStack spacing={16} modifiers={[padding({ all: 16 }), activityBackgroundTint('#080B0D')]}>
      <VStack alignment="leading" spacing={6}><Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle(color)]}>GYMTRACKER · {finished ? 'REPOS TERMINÉ' : 'REPOS'}</Text><Text modifiers={[font({ size: 15, weight: 'bold' }), foregroundStyle('#FFFFFF')]}>{props.exerciseName}</Text><Text modifiers={[font({ size: 12 }), foregroundStyle('#A5B3AA')]}>{props.setNumber > 0 ? `Après la série ${props.setNumber}` : 'Repos libre'}</Text></VStack>
      {countdown}
    </HStack>,
    compactLeading: <Image systemName="timer" color={color} />,
    compactTrailing: compactTimer,
    minimal: <Image systemName="timer" color={color} />,
    expandedLeading: <Text modifiers={[font({ size: 13, weight: 'bold' }), foregroundStyle(color)]}>GYMTRACKER</Text>,
    expandedTrailing: countdown,
    expandedBottom: <VStack spacing={5}><Text modifiers={[font({ size: 14 }), foregroundStyle('#FFFFFF')]}>{props.exerciseName}</Text><Text modifiers={[font({ size: 11 }), foregroundStyle('#A5B3AA')]}>{finished ? 'Prêt pour la suite' : 'Appuie pour retrouver ta séance'}</Text></VStack>,
  };
};
export default createLiveActivity('GymTrackerRestActivity', RestActivity);
