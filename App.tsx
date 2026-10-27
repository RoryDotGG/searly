import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import LiveScreen from './src/screens/LiveScreen';
import PairScreen from './src/screens/PairScreen';
import { useG1 } from './src/useG1';

// No router: the connection state picks the screen (see docs/SPEC.md).
export default function App() {
  const g1 = useG1();
  const { kind } = g1.phase;
  const pairing =
    kind === 'no-identity' || kind === 'pairing' || kind === 'needs-repair' || (kind === 'error' && !g1.paired);

  return (
    <>
      {kind === 'starting' ? (
        <View style={{ flex: 1, backgroundColor: '#fff' }} />
      ) : pairing ? (
        <PairScreen g1={g1} />
      ) : (
        <LiveScreen g1={g1} />
      )}
      <StatusBar style="auto" />
    </>
  );
}
