import { Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
type Props = { nextWorkout: string; nextWorkoutSubtitle: string; weeklySessions: number; weeklyGoal: number; streakWeeks: number };
const GymTracker = (props: Props, environment: WidgetEnvironment) => {
  'widget';
  return <VStack alignment="leading" spacing={10} modifiers={[containerBackground('#080B0D', 'widget'), widgetURL('gymtracker:///')]}>
    <Text modifiers={[font({ size: 11, weight: 'bold' }), foregroundStyle('#4ADE80')]}>GYMTRACKER</Text>
    <Text modifiers={[font({ size: 10 }), foregroundStyle('#A5B3AA')]}>PROCHAINE SÉANCE</Text>
    <Text modifiers={[font({ size: environment.widgetFamily === 'systemSmall' ? 19 : 25, weight: 'bold' }), foregroundStyle('#F4F8F6')]}>{props.nextWorkout}</Text>
    {environment.widgetFamily !== 'systemSmall' && <Text modifiers={[font({ size: 12 }), foregroundStyle('#A5B3AA')]}>{props.nextWorkoutSubtitle}</Text>}
    <Text modifiers={[font({ size: 12 }), foregroundStyle('#4ADE80')]}>{props.weeklySessions} / {props.weeklyGoal} cette semaine</Text>
    {environment.widgetFamily !== 'systemSmall' && <Text modifiers={[font({ size: 11 }), foregroundStyle('#A5B3AA')]}>{props.streakWeeks} semaines régulières</Text>}
  </VStack>;
};
export default createWidget('GymTrackerWidget', GymTracker, { nextWorkout: 'Séance libre', nextWorkoutSubtitle: 'Ouvre GymTracker', weeklySessions: 0, weeklyGoal: 3, streakWeeks: 0 });
