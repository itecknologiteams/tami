import 'package:flutter_test/flutter_test.dart';
import 'package:tami_mobile/src/domain/ride_state.dart';

void main() {
  group('RideStateMachine', () {
    test('allows the normal ride lifecycle', () {
      expect(
        canTransitionRideState(RideState.requested, RideState.matching),
        isTrue,
      );
      expect(
        canTransitionRideState(RideState.matching, RideState.offeredToDriver),
        isTrue,
      );
      expect(
        canTransitionRideState(RideState.offeredToDriver, RideState.accepted),
        isTrue,
      );
      expect(
        canTransitionRideState(
          RideState.accepted,
          RideState.driverEnRouteToPickup,
        ),
        isTrue,
      );
      expect(
        canTransitionRideState(
          RideState.driverEnRouteToPickup,
          RideState.arrivedAtPickup,
        ),
        isTrue,
      );
      expect(
        canTransitionRideState(
          RideState.arrivedAtPickup,
          RideState.riderOnboarded,
        ),
        isTrue,
      );
      expect(
        canTransitionRideState(RideState.riderOnboarded, RideState.inProgress),
        isTrue,
      );
      expect(
        canTransitionRideState(
          RideState.inProgress,
          RideState.arrivedAtDestination,
        ),
        isTrue,
      );
      expect(
        canTransitionRideState(
          RideState.arrivedAtDestination,
          RideState.paymentPending,
        ),
        isTrue,
      );
      expect(
        canTransitionRideState(RideState.paymentPending, RideState.completed),
        isTrue,
      );
    });

    test('blocks invalid backward transitions', () {
      expect(
        canTransitionRideState(RideState.completed, RideState.inProgress),
        isFalse,
      );

      expect(
        () => assertRideStateTransition(
          RideState.completed,
          RideState.inProgress,
        ),
        throwsA(
          isA<InvalidRideStateTransitionException>().having(
            (error) => error.message,
            'message',
            'Invalid ride state transition: completed -> in_progress',
          ),
        ),
      );
    });

    test('allows cancellation from active pre-completion states', () {
      expect(
        canTransitionRideState(RideState.requested, RideState.cancelledByRider),
        isTrue,
      );
      expect(
        canTransitionRideState(RideState.accepted, RideState.cancelledByDriver),
        isTrue,
      );
      expect(
        canTransitionRideState(
          RideState.inProgress,
          RideState.cancelledByAdmin,
        ),
        isTrue,
      );
    });
  });
}
