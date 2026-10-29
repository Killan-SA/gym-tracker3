import { useMemo, useRef, useState, useEffect, type ComponentRef, type ReactElement } from 'react';
import { FlatList, PanResponder, View, type FlatListProps, type LayoutRectangle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getExerciseDropIndex, moveExerciseItem } from '../lib/exerciseDrag';

type Props<T> = Omit<FlatListProps<T>, 'renderItem'> & {
  data: T[]; keyExtractor: (item: T, index: number) => string;
  renderItem: (info: { item: T; index: number; dragHandle: ReactElement; isActive: boolean }) => ReactElement;
  onDragBegin?: () => void; onDragEnd: (event: { data: T[] }) => void;
};
// Native FlatList + PanResponder: supports variable-height workout cards without
// relying on InteractionManager, removed from this project's React Native.
export default function DraggableExerciseList<T>({ data, renderItem, keyExtractor, onDragBegin, onDragEnd, ...props }: Props<T>) {
  const list = useRef<FlatList<T>>(null);
  const frame = useRef<ComponentRef<typeof View>>(null);
  const layouts = useRef(new Map<number, LayoutRectangle>());
  const offset = useRef(0);
  const active = useRef<number | null>(null);
  const target = useRef(0);
  const startOffset = useRef(0);
  const viewport = useRef({ y: 0, height: 0 });
  const pointer = useRef(0);
  const autoscroll = useRef<ReturnType<typeof setInterval> | null>(null);
  const latest = useRef({ data, onDragEnd }); latest.current = { data, onDragEnd };
  const [dragState, setDragState] = useState<{ index: number; dy: number; target: number } | null>(null);
  const finishRef = useRef<(commit: boolean) => void>(() => {});
  finishRef.current = commit => {
    if (autoscroll.current) clearInterval(autoscroll.current); autoscroll.current = null;
    const from = active.current; const to = target.current;
    active.current = null; setDragState(null);
    if (commit && from !== null && to !== from) {
      latest.current.onDragEnd({ data: moveExerciseItem(latest.current.data, from, to) });
    }
  };
  const recalculate = (dy: number) => {
    const from = active.current; if (from === null) return;
    const delta = dy + offset.current - startOffset.current;
    const nearest = getExerciseDropIndex(layouts.current, from, delta, latest.current.data.length);
    target.current = nearest; setDragState({ index: from, dy: delta, target: nearest });
  };
  const moveRef = useRef(recalculate); moveRef.current = recalculate;
  const dyRef = useRef(0);
  const startPointer = useRef(0);
  const cellRenderer = useMemo(() => function DragCell(cellProps: any) {
    const { children, onLayout, index, style } = cellProps;
    return <View style={[style, { zIndex: active.current === index ? 10 : 0, overflow: 'visible' }]} onLayout={event => { layouts.current.set(index, event.nativeEvent.layout); onLayout?.(event); }}>{children}</View>;
  }, []);
  // Cancel a held drag when navigating away/unmounting.
  // No SQL changes are made until the finger is released.
  const cleanup = useRef(() => { if (autoscroll.current) clearInterval(autoscroll.current); });
  useUnmount(cleanup.current);
  return <View ref={frame} style={{ flex: 1 }}><FlatList {...props} ref={list} data={data} keyExtractor={keyExtractor}
    extraData={dragState} scrollEnabled={dragState === null} CellRendererComponent={cellRenderer}
    removeClippedSubviews={false} scrollEventThrottle={16}
    onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; props.onScroll?.(event); }}
    renderItem={({ item, index }) => <View style={{ transform: [{ translateY: dragState?.index === index ? dragState.dy : 0 }] }}>
      {dragState && dragState.target === index && dragState.index !== index && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, height: 3, backgroundColor: '#4ADE80', ...(index > dragState.index ? { bottom: 0 } : { top: 0 }) }} />}
      {renderItem({ item, index, isActive: dragState?.index === index, dragHandle: <DragHandle onBegin={pageY => {
      if (active.current !== null) return;
      active.current = index; target.current = index; startOffset.current = offset.current; dyRef.current = 0;
      startPointer.current = pageY; pointer.current = pageY;
      setDragState({ index, dy: 0, target: index }); onDragBegin?.();
      frame.current?.measureInWindow((_x, y, _width, height) => { viewport.current = { y, height }; });
      autoscroll.current = setInterval(() => {
        const { y, height } = viewport.current;
        if (!height) return;
        const direction = pointer.current < y + 70 ? -1 : pointer.current > y + height - 70 ? 1 : 0;
        if (direction) { const next = Math.max(0, offset.current + direction * 18); list.current?.scrollToOffset({ offset: next, animated: false }); moveRef.current(dyRef.current); }
      }, 50);
    }} onMove={pageY => { pointer.current = pageY; dyRef.current = pageY - startPointer.current; moveRef.current(dyRef.current); }} onEnd={commit => finishRef.current(commit)} /> })}</View>}
  /></View>;
}
function useUnmount(cleanup: () => void) { useEffect(() => cleanup, [cleanup]); }

// Claim touches on the handle immediately, before the native scroll/modal
// recognizers can steal a long press. Other parts of the card scroll normally.
function DragHandle(props: { onBegin: (pageY: number) => void; onMove: (pageY: number) => void; onEnd: (commit: boolean) => void }) {
  const latest = useRef(props); latest.current = props;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragging = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const cancelHold = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: event => {
      cancelHold(); const { pageX, pageY } = event.nativeEvent; origin.current = { x: pageX, y: pageY };
      timer.current = setTimeout(() => { timer.current = null; dragging.current = true; latest.current.onBegin(pageY); }, 220);
    },
    onPanResponderMove: event => {
      const { pageX, pageY } = event.nativeEvent;
      if (dragging.current) latest.current.onMove(pageY);
      else if (Math.abs(pageY - origin.current.y) > 10 || Math.abs(pageX - origin.current.x) > 10) cancelHold();
    },
    onPanResponderRelease: () => { cancelHold(); if (dragging.current) { dragging.current = false; latest.current.onEnd(true); } },
    onPanResponderTerminate: () => { cancelHold(); if (dragging.current) { dragging.current = false; latest.current.onEnd(false); } },
    onPanResponderTerminationRequest: () => false,
    onShouldBlockNativeResponder: () => true,
  }), []);
  useEffect(() => () => cancelHold(), []);
  return <View accessible accessibilityRole="button" accessibilityLabel="Maintenir pour déplacer cet exercice" accessibilityHint="Maintiens la poignée puis déplace ton doigt vers le haut ou le bas." style={{ padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }} {...responder.panHandlers}><Ionicons name="reorder-three" size={25} color="#4ADE80" /></View>;
}
