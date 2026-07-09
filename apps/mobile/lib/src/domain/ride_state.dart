enum RideState {
  requested('requested'),
  matching('matching'),
  offeredToDriver('offered_to_driver'),
  accepted('accepted'),
  driverEnRouteToPickup('driver_en_route_to_pickup'),
  arrivedAtPickup('arrived_at_pickup'),
  riderOnboarded('rider_onboarded'),
  inProgress('in_progress'),
  arrivedAtDestination('arrived_at_destination'),
  paymentPending('payment_pending'),
  completed('completed'),
  cancelledByRider('cancelled_by_rider'),
  cancelledByDriver('cancelled_by_driver'),
  cancelledByAdmin('cancelled_by_admin'),
  noShow('no_show'),
  driverTimeout('driver_timeout'),
  paymentFailed('payment_failed'),
  disputed('disputed'),
  incidentReported('incident_reported');

  const RideState(this.wireName);

  final String wireName;
}

const Map<RideState, Set<RideState>> _transitions = {
  RideState.requested: {
    RideState.matching,
    RideState.cancelledByRider,
    RideState.cancelledByAdmin,
  },
  RideState.matching: {
    RideState.offeredToDriver,
    RideState.driverTimeout,
    RideState.cancelledByRider,
    RideState.cancelledByAdmin,
  },
  RideState.offeredToDriver: {
    RideState.accepted,
    RideState.driverTimeout,
    RideState.cancelledByRider,
    RideState.cancelledByAdmin,
  },
  RideState.accepted: {
    RideState.driverEnRouteToPickup,
    RideState.cancelledByRider,
    RideState.cancelledByDriver,
    RideState.cancelledByAdmin,
    RideState.incidentReported,
  },
  RideState.driverEnRouteToPickup: {
    RideState.arrivedAtPickup,
    RideState.cancelledByRider,
    RideState.cancelledByDriver,
    RideState.cancelledByAdmin,
    RideState.incidentReported,
  },
  RideState.arrivedAtPickup: {
    RideState.riderOnboarded,
    RideState.noShow,
    RideState.cancelledByRider,
    RideState.cancelledByDriver,
    RideState.cancelledByAdmin,
    RideState.incidentReported,
  },
  RideState.riderOnboarded: {
    RideState.inProgress,
    RideState.cancelledByAdmin,
    RideState.incidentReported,
  },
  RideState.inProgress: {
    RideState.arrivedAtDestination,
    RideState.cancelledByAdmin,
    RideState.incidentReported,
    RideState.disputed,
  },
  RideState.arrivedAtDestination: {
    RideState.paymentPending,
    RideState.disputed,
    RideState.incidentReported,
  },
  RideState.paymentPending: {
    RideState.completed,
    RideState.paymentFailed,
    RideState.disputed,
  },
  RideState.completed: {RideState.disputed},
  RideState.cancelledByRider: {RideState.disputed},
  RideState.cancelledByDriver: {RideState.disputed},
  RideState.cancelledByAdmin: {RideState.disputed},
  RideState.noShow: {RideState.disputed},
  RideState.driverTimeout: {RideState.matching, RideState.cancelledByAdmin},
  RideState.paymentFailed: {RideState.paymentPending, RideState.disputed},
  RideState.disputed: {},
  RideState.incidentReported: {RideState.disputed, RideState.cancelledByAdmin},
};

bool canTransitionRideState(RideState from, RideState to) {
  return _transitions[from]?.contains(to) ?? false;
}

void assertRideStateTransition(RideState from, RideState to) {
  if (!canTransitionRideState(from, to)) {
    throw InvalidRideStateTransitionException(from, to);
  }
}

class InvalidRideStateTransitionException implements Exception {
  const InvalidRideStateTransitionException(this.from, this.to);

  final RideState from;
  final RideState to;

  String get message =>
      'Invalid ride state transition: ${from.wireName} -> ${to.wireName}';

  @override
  String toString() => message;
}
