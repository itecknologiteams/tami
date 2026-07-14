import 'dart:async';

import 'package:flutter/material.dart';

import '../../location/rider_location.dart';
import '../../location/rider_location_client.dart';
import '../../maps/tami_map_surface.dart';
import '../../maps/tami_map_view_state.dart';
import '../../realtime/realtime_client.dart';
import '../../ui/tami_colors.dart';
import '../../ui/tami_glass.dart';
import '../rider/chat/ride_chat_sheet.dart';
import '../rider/rider_chat_client.dart';
import 'driver_ride.dart';
import 'driver_ride_client.dart';
import 'driver_session.dart';

class DriverHomeScreen extends StatefulWidget {
  const DriverHomeScreen({
    required this.session,
    required this.rideClient,
    this.chatClient,
    this.locationClient,
    this.mapSurface,
    this.realtimeClient,
    this.apiBaseUrl,
    // Fallback poll interval while a ride is active/offline of the socket;
    // the socket delivers offers/state changes immediately when connected.
    this.pollInterval = const Duration(seconds: 15),
    super.key,
  });

  final DriverSession session;
  final DriverRideClient rideClient;
  final RiderChatClient? chatClient;
  final RiderLocationClient? locationClient;
  final Widget? mapSurface;
  final RealtimeClient? realtimeClient;
  final String? apiBaseUrl;
  final Duration pollInterval;

  @override
  State<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends State<DriverHomeScreen> {
  Timer? _pollTimer;
  Timer? _locationTimer;
  bool _online = false;
  bool _isBusy = false;
  DriverRide? _ride;
  DriverRide? _completedRide;
  DriverRoute? _route;
  String? _routeForRideId;
  String? _error;
  RealtimeClient? _realtimeClient;
  StreamSubscription<Map<String, dynamic>>? _offerSubscription;
  StreamSubscription<Map<String, dynamic>>? _rideStateSubscription;

  @override
  void initState() {
    super.initState();
    _connectRealtime();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _locationTimer?.cancel();
    _offerSubscription?.cancel();
    _rideStateSubscription?.cancel();
    _realtimeClient?.dispose();
    super.dispose();
  }

  void _connectRealtime() {
    final accessToken = widget.session.accessToken;
    final baseUrl = widget.apiBaseUrl;
    final client =
        widget.realtimeClient ??
        (baseUrl != null
            ? SocketIoRealtimeClient(
                baseUrl: baseUrl,
                namespace: '/driver',
                accessToken: accessToken,
              )
            : null);
    if (client == null) {
      return;
    }
    _realtimeClient = client;
    client.connect();
    _offerSubscription = client.on<Map<String, dynamic>>('ride.offer').listen((
      _,
    ) {
      if (_online && !_isBusy) {
        unawaited(_refreshRide());
      }
    });
    _rideStateSubscription = client
        .on<Map<String, dynamic>>('ride.state_changed')
        .listen(_onRideStateChanged);
  }

  void _onRideStateChanged(Map<String, dynamic> event) {
    final ride = _ride;
    if (ride == null || event['rideId'] != ride.id || !mounted) {
      return;
    }
    final state = event['state'] as String?;
    if (state == null || state == ride.state) {
      return;
    }
    // The driver app itself always drives its own state changes through the
    // REST actions (accept/advance/complete); this only matters if the ride
    // was reassigned or cancelled by another actor (e.g. rider/admin).
    if (state == 'cancelled_by_rider' || state == 'cancelled_by_admin') {
      setState(() {
        _ride = null;
        _route = null;
        _routeForRideId = null;
      });
    }
  }

  Future<void> _setOnline(bool online) async {
    await _guard(() async {
      await widget.rideClient.setAvailability(
        accessToken: widget.session.accessToken,
        online: online,
      );
      setState(() {
        _online = online;
        _completedRide = null;
      });
      if (online) {
        _startPolling();
        _startLocationPings();
        await _refreshRide();
      } else {
        _stopPolling();
        _stopLocationPings();
        setState(() {
          _ride = null;
          _route = null;
          _routeForRideId = null;
        });
      }
    });
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(widget.pollInterval, (_) {
      if (!_isBusy) {
        unawaited(_refreshRide());
      }
    });
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  void _startLocationPings() {
    final locationClient = widget.locationClient;
    if (locationClient == null) {
      return;
    }
    _locationTimer?.cancel();
    _locationTimer = Timer.periodic(widget.pollInterval * 3, (_) {
      unawaited(_pingLocation(locationClient));
    });
    unawaited(_pingLocation(locationClient));
  }

  void _stopLocationPings() {
    _locationTimer?.cancel();
    _locationTimer = null;
  }

  Future<void> _pingLocation(RiderLocationClient locationClient) async {
    try {
      final result = await locationClient.locate();
      final location = result.location;
      if (result.status != RiderLocationStatus.ready || location == null) {
        return;
      }
      await widget.rideClient.pingLocation(
        accessToken: widget.session.accessToken,
        latitude: location.latitude,
        longitude: location.longitude,
      );
    } catch (_) {
      // Location pings are best-effort; the next tick retries.
    }
  }

  Future<void> _refreshRide() async {
    try {
      final ride = await widget.rideClient.getCurrentRide(
        accessToken: widget.session.accessToken,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _ride = ride;
        _error = null;
      });
      if (ride != null && ride.id != _routeForRideId) {
        await _loadRoute(ride);
      }
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
      });
    }
  }

  Future<void> _loadRoute(DriverRide ride) async {
    try {
      final route = await widget.rideClient.getRideRoute(
        accessToken: widget.session.accessToken,
        rideId: ride.id,
      );
      if (mounted) {
        setState(() {
          _route = route;
          _routeForRideId = ride.id;
        });
      }
    } catch (_) {
      // The map still shows pickup/destination markers without a ribbon.
    }
  }

  Future<void> _accept() async {
    final ride = _ride;
    if (ride == null) {
      return;
    }
    await _guard(() async {
      final updated = await widget.rideClient.acceptRide(
        accessToken: widget.session.accessToken,
        rideId: ride.id,
      );
      setState(() {
        _ride = updated;
      });
    });
  }

  Future<void> _decline() async {
    final ride = _ride;
    if (ride == null) {
      return;
    }
    await _guard(() async {
      await widget.rideClient.declineRide(
        accessToken: widget.session.accessToken,
        rideId: ride.id,
      );
      setState(() {
        _ride = null;
        _route = null;
        _routeForRideId = null;
      });
    });
  }

  Future<void> _advance(String to) async {
    final ride = _ride;
    if (ride == null) {
      return;
    }
    await _guard(() async {
      final updated = await widget.rideClient.advanceRide(
        accessToken: widget.session.accessToken,
        rideId: ride.id,
        to: to,
      );
      setState(() {
        _ride = updated;
      });
    });
  }

  Future<void> _complete() async {
    final ride = _ride;
    if (ride == null) {
      return;
    }
    await _guard(() async {
      final completed = await widget.rideClient.completeRide(
        accessToken: widget.session.accessToken,
        rideId: ride.id,
      );
      setState(() {
        _ride = null;
        _completedRide = completed;
        _route = null;
        _routeForRideId = null;
      });
    });
  }

  Future<void> _cancel() async {
    final ride = _ride;
    if (ride == null) {
      return;
    }
    await _guard(() async {
      await widget.rideClient.cancelRide(
        accessToken: widget.session.accessToken,
        rideId: ride.id,
      );
      setState(() {
        _ride = null;
        _route = null;
        _routeForRideId = null;
      });
    });
  }

  void _openChat() {
    final ride = _ride;
    final chatClient = widget.chatClient;
    if (ride == null || chatClient == null) {
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => RideChatSheet(
        accessToken: widget.session.accessToken,
        rideId: ride.id,
        chatClient: chatClient,
        ownSenderType: 'driver',
        title: 'Chat with rider',
        inputHint: 'Message rider',
      ),
    );
  }

  Future<void> _guard(Future<void> Function() action) async {
    setState(() {
      _isBusy = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      if (mounted) {
        setState(() {
          _error = error.toString();
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isBusy = false;
        });
      }
    }
  }

  TamiMapViewState get _mapViewState {
    final ride = _ride;
    if (ride == null) {
      return const TamiMapViewState();
    }
    return TamiMapViewState(
      pickup: TamiMapCoordinate(
        latitude: ride.pickup.latitude,
        longitude: ride.pickup.longitude,
      ),
      destination: TamiMapCoordinate(
        latitude: ride.destination.latitude,
        longitude: ride.destination.longitude,
      ),
      routeCoordinates: _routeForRideId == ride.id && _route != null
          ? _route!.coordinates
                .map(
                  (coordinate) => TamiMapCoordinate(
                    latitude: coordinate.latitude,
                    longitude: coordinate.longitude,
                  ),
                )
                .toList()
          : const [],
    );
  }

  @override
  Widget build(BuildContext context) {
    final driver = widget.session.driver;
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: widget.mapSurface ?? TamiMapSurface(viewState: _mapViewState),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TamiGlass(
                    semanticLabel: 'Driver duty status',
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Tami Driver',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                '${driver.name} · ${driver.cityName}',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: TamiColors.mutedInk,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Switch(
                              key: const Key('driver-online-switch'),
                              value: _online,
                              onChanged: _isBusy
                                  ? null
                                  : (value) => _setOnline(value),
                            ),
                            Text(
                              _online ? 'Online' : 'Offline',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 10),
                    TamiGlass(
                      semanticLabel: 'Driver error',
                      padding: const EdgeInsets.all(12),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: TamiColors.danger),
                      ),
                    ),
                  ],
                  const Spacer(),
                  _buildBottomPanel(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomPanel() {
    final completed = _completedRide;
    if (completed != null) {
      return _CompletionSummary(
        ride: completed,
        onDismiss: () {
          setState(() {
            _completedRide = null;
          });
        },
      );
    }

    if (!_online) {
      return const TamiGlass(
        semanticLabel: 'Duty hint',
        padding: EdgeInsets.all(18),
        child: Text('Go online to receive ride offers.'),
      );
    }

    final ride = _ride;
    if (ride == null) {
      return const TamiGlass(
        semanticLabel: 'Waiting for rides',
        padding: EdgeInsets.all(18),
        child: Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2.4),
            ),
            SizedBox(width: 12),
            Expanded(child: Text('Waiting for the next ride request…')),
          ],
        ),
      );
    }

    return _RideCard(
      ride: ride,
      route: _routeForRideId == ride.id ? _route : null,
      isBusy: _isBusy,
      canChat: widget.chatClient != null && _canChat(ride.state),
      onAccept: _accept,
      onDecline: _decline,
      onAdvance: _advance,
      onComplete: _complete,
      onCancel: _cancel,
      onChat: _openChat,
    );
  }

  bool _canChat(String state) {
    return state != 'offered_to_driver';
  }
}

class _RideCard extends StatelessWidget {
  const _RideCard({
    required this.ride,
    required this.route,
    required this.isBusy,
    required this.canChat,
    required this.onAccept,
    required this.onDecline,
    required this.onAdvance,
    required this.onComplete,
    required this.onCancel,
    required this.onChat,
  });

  final DriverRide ride;
  final DriverRoute? route;
  final bool isBusy;
  final bool canChat;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final void Function(String to) onAdvance;
  final VoidCallback onComplete;
  final VoidCallback onCancel;
  final VoidCallback onChat;

  @override
  Widget build(BuildContext context) {
    final action = _primaryAction();
    return TamiGlass(
      semanticLabel: 'Current ride',
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  _stateLabel(ride.state),
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              if (canChat)
                IconButton(
                  key: const Key('driver-chat-button'),
                  tooltip: 'Chat with rider',
                  onPressed: onChat,
                  icon: const Icon(Icons.chat_bubble_outline),
                ),
            ],
          ),
          const SizedBox(height: 12),
          _AddressRow(icon: Icons.trip_origin, address: ride.pickupAddress),
          const SizedBox(height: 6),
          _AddressRow(icon: Icons.flag, address: ride.destinationAddress),
          const SizedBox(height: 12),
          Wrap(
            spacing: 14,
            runSpacing: 4,
            children: [
              if (ride.estimatedFareMinor != null)
                Text(
                  'Fare ${ride.currency} '
                  '${(ride.estimatedFareMinor! / 100).toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              if (route != null)
                Text(
                  '${(route!.distanceMeters / 1000).toStringAsFixed(1)} km · '
                  '${(route!.durationSeconds / 60).round()} min',
                  style: const TextStyle(color: TamiColors.mutedInk),
                ),
              if (ride.riderPhone != null)
                Text(
                  'Rider ${ride.riderPhone}',
                  style: const TextStyle(color: TamiColors.mutedInk),
                ),
            ],
          ),
          const SizedBox(height: 14),
          if (ride.state == 'offered_to_driver') ...[
            FilledButton(
              key: const Key('driver-accept-button'),
              onPressed: isBusy ? null : onAccept,
              child: const Text('Accept ride'),
            ),
            const SizedBox(height: 8),
            OutlinedButton(
              key: const Key('driver-decline-button'),
              onPressed: isBusy ? null : onDecline,
              child: const Text('Decline'),
            ),
          ] else if (action != null) ...[
            FilledButton(
              key: const Key('driver-primary-action'),
              onPressed: isBusy
                  ? null
                  : () {
                      if (action.advanceTo != null) {
                        onAdvance(action.advanceTo!);
                      } else {
                        onComplete();
                      }
                    },
              child: Text(action.label),
            ),
            if (_canCancel(ride.state)) ...[
              const SizedBox(height: 8),
              OutlinedButton(
                key: const Key('driver-cancel-button'),
                onPressed: isBusy ? null : onCancel,
                child: const Text('Cancel ride'),
              ),
            ],
          ],
        ],
      ),
    );
  }

  _PrimaryAction? _primaryAction() {
    switch (ride.state) {
      case 'accepted':
        return const _PrimaryAction(
          label: 'Head to pickup',
          advanceTo: 'driver_en_route_to_pickup',
        );
      case 'driver_en_route_to_pickup':
        return const _PrimaryAction(
          label: 'Arrived at pickup',
          advanceTo: 'arrived_at_pickup',
        );
      case 'arrived_at_pickup':
        return const _PrimaryAction(
          label: 'Rider on board',
          advanceTo: 'rider_onboarded',
        );
      case 'rider_onboarded':
        return const _PrimaryAction(
          label: 'Start trip',
          advanceTo: 'in_progress',
        );
      case 'in_progress':
        return const _PrimaryAction(
          label: 'Arrived at destination',
          advanceTo: 'arrived_at_destination',
        );
      case 'arrived_at_destination':
        return const _PrimaryAction(label: 'Collect fare & complete');
      default:
        return null;
    }
  }

  bool _canCancel(String state) {
    return state == 'accepted' ||
        state == 'driver_en_route_to_pickup' ||
        state == 'arrived_at_pickup';
  }

  String _stateLabel(String state) {
    switch (state) {
      case 'offered_to_driver':
        return 'New ride offer';
      case 'accepted':
        return 'Ride accepted';
      case 'driver_en_route_to_pickup':
        return 'Heading to pickup';
      case 'arrived_at_pickup':
        return 'At pickup point';
      case 'rider_onboarded':
        return 'Rider on board';
      case 'in_progress':
        return 'Trip in progress';
      case 'arrived_at_destination':
        return 'At destination';
      default:
        return state.replaceAll('_', ' ');
    }
  }
}

class _PrimaryAction {
  const _PrimaryAction({required this.label, this.advanceTo});

  final String label;
  final String? advanceTo;
}

class _AddressRow extends StatelessWidget {
  const _AddressRow({required this.icon, required this.address});

  final IconData icon;
  final String address;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18),
        const SizedBox(width: 8),
        Expanded(child: Text(address)),
      ],
    );
  }
}

class _CompletionSummary extends StatelessWidget {
  const _CompletionSummary({required this.ride, required this.onDismiss});

  final DriverRide ride;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final fareMinor = ride.finalFareMinor ?? ride.estimatedFareMinor;
    return TamiGlass(
      semanticLabel: 'Ride completed',
      padding: const EdgeInsets.all(20),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.check_circle,
            size: 48,
            color: TamiColors.civicGreen,
          ),
          const SizedBox(height: 10),
          const Text(
            'Ride completed',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          if (fareMinor != null) ...[
            const SizedBox(height: 6),
            Text(
              'Collect ${ride.currency} ${(fareMinor / 100).toStringAsFixed(0)}',
              key: const Key('driver-final-fare'),
            ),
          ],
          const SizedBox(height: 14),
          FilledButton(
            key: const Key('driver-next-ride-button'),
            onPressed: onDismiss,
            child: const Text('Ready for next ride'),
          ),
        ],
      ),
    );
  }
}
