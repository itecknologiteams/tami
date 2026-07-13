import 'package:flutter/material.dart';

import '../../auth/rider_session.dart';
import '../../maps/tami_map_surface.dart';
import '../../ui/tami_colors.dart';
import '../../ui/tami_glass.dart';
import 'active_ride/active_ride_panel.dart';
import 'booking/booking_composer.dart';
import 'booking/destination_search_sheet.dart';
import 'booking/ride_options_sheet.dart';
import 'booking/tami_place.dart';
import 'chat/ride_chat_sheet.dart';
import 'rider_booking_client.dart';
import 'rider_chat_client.dart';
import 'rider_ride_query_client.dart';
import 'rider_saved_place_client.dart';

export 'booking/tami_place.dart';

class RiderHomeScreen extends StatefulWidget {
  const RiderHomeScreen({
    this.mapSurface,
    this.session,
    this.bookingClient,
    this.chatClient,
    this.rideQueryClient,
    this.savedPlaceClient,
    this.initialRide,
    this.initialDestination,
    super.key,
  }) : assert(initialRide == null || initialDestination != null);

  final Widget? mapSurface;
  final RiderSession? session;
  final RiderBookingClient? bookingClient;
  final RiderChatClient? chatClient;
  final RiderRideQueryClient? rideQueryClient;
  final RiderSavedPlaceClient? savedPlaceClient;
  final RiderBookingRide? initialRide;
  final TamiPlace? initialDestination;

  @override
  State<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends State<RiderHomeScreen> {
  TamiPlace? _destination;
  RiderBookingRide? _activeRide;
  List<RiderSavedPlace> _savedPlaces = const [];

  @override
  void initState() {
    super.initState();
    _destination = widget.initialDestination;
    _activeRide = widget.initialRide;
    if (_activeRide == null) {
      _restoreCurrentRide();
    }
    _loadSavedPlaces();
  }

  Future<void> _loadSavedPlaces() async {
    final client = widget.savedPlaceClient;
    final session = widget.session;
    if (client == null || session == null) {
      return;
    }
    try {
      final places = await client.listPlaces(accessToken: session.accessToken);
      if (mounted) {
        setState(() => _savedPlaces = places);
      }
    } on RiderSavedPlaceException {
      // Destination search remains available when saved places cannot load.
    }
  }

  Future<void> _restoreCurrentRide() async {
    final client = widget.rideQueryClient;
    final session = widget.session;
    if (client == null || session == null) {
      return;
    }
    try {
      final ride = await client.getCurrentRide(
        accessToken: session.accessToken,
      );
      if (!mounted || ride == null) {
        return;
      }
      setState(() {
        _activeRide = RiderBookingRide(
          id: ride.id,
          state: ride.state,
          categoryCode: ride.categoryCode,
          scheduledPickupAt: ride.scheduledPickupAt,
        );
        _destination = TamiPlace(
          name: ride.destination.address.split(',').first,
          address: ride.destination.address,
          latitude: ride.destination.latitude,
          longitude: ride.destination.longitude,
        );
      });
    } on RiderRideQueryException {
      // The booking surface remains available; reconnect recovery follows later.
    }
  }

  Future<void> _openDestinationSearch() async {
    final destination = await showModalBottomSheet<TamiPlace>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DestinationSearchSheet(
        savedPlaces: _savedPlaces,
        showSavedPlacePrompts: widget.savedPlaceClient == null,
      ),
    );
    if (!mounted || destination == null) {
      return;
    }

    setState(() => _destination = destination);
    _openRideOptions(destination);
  }

  void _openRideOptions(TamiPlace destination) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) =>
          RideOptionsSheet(destination: destination, onConfirm: _requestRide),
    );
  }

  Future<void> _requestRide(RideSelection selection) async {
    final bookingClient = widget.bookingClient;
    final session = widget.session;
    if (bookingClient == null || session == null) {
      throw const RiderBookingException('Sign in to request a ride.');
    }

    final ride = await bookingClient.createRide(
      accessToken: session.accessToken,
      request: CreateRiderRideRequest(
        categoryCode: selection.categoryCode,
        pickup: const RiderCoordinates(
          latitude: 24.8607,
          longitude: 67.0011,
          address: 'Frere Hall, Karachi',
        ),
        destination: RiderCoordinates(
          latitude: selection.destination.latitude,
          longitude: selection.destination.longitude,
          address: selection.destination.address,
        ),
        scheduledPickupAt: selection.scheduledPickupAt,
      ),
    );
    if (mounted) {
      setState(() => _activeRide = ride);
    }
  }

  Future<void> _confirmCancelRide() async {
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel this ride?'),
        content: const Text('This will stop the current driver search.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep ride'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Cancel ride'),
          ),
        ],
      ),
    );
    if (shouldCancel != true) {
      return;
    }

    final bookingClient = widget.bookingClient;
    final session = widget.session;
    final activeRide = _activeRide;
    if (bookingClient == null || session == null || activeRide == null) {
      return;
    }
    try {
      await bookingClient.cancelRide(
        accessToken: session.accessToken,
        rideId: activeRide.id,
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _activeRide = null;
        _destination = null;
      });
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Ride cancelled')));
    } on RiderBookingException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _openChat() async {
    final chatClient = widget.chatClient;
    final session = widget.session;
    final activeRide = _activeRide;
    if (chatClient == null || session == null || activeRide == null) {
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => RideChatSheet(
        accessToken: session.accessToken,
        rideId: activeRide.id,
        chatClient: chatClient,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          Positioned.fill(
            child: RepaintBoundary(
              key: const Key('rider-map'),
              child: widget.mapSurface ?? const TamiMapSurface(),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
              child: Column(
                children: [
                  Row(
                    children: [
                      const _CityPill(),
                      const Spacer(),
                      TamiGlass(
                        key: const Key('rider-safety-glass'),
                        level: TamiGlassLevel.navigation,
                        semanticLabel: 'Safety center',
                        padding: EdgeInsets.zero,
                        child: IconButton(
                          tooltip: 'Safety center',
                          onPressed: () {},
                          icon: const Icon(Icons.shield_outlined),
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 520),
                    child: _activeRide == null
                        ? BookingComposer(
                            destination: _destination,
                            onDestinationTap: _openDestinationSearch,
                          )
                        : ActiveRidePanel(
                            destination: _destination!,
                            rideState: _activeRide!.state,
                            onCancel: _confirmCancelRide,
                            onChat: widget.chatClient == null
                                ? null
                                : _openChat,
                          ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CityPill extends StatelessWidget {
  const _CityPill();

  @override
  Widget build(BuildContext context) {
    return const TamiGlass(
      key: Key('rider-city-glass'),
      level: TamiGlassLevel.navigation,
      semanticLabel: 'Service city Karachi',
      padding: EdgeInsets.zero,
      child: Padding(
        padding: EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.location_city_outlined,
              size: 18,
              color: TamiColors.civicGreen,
            ),
            SizedBox(width: 8),
            Text('Karachi', style: TextStyle(fontWeight: FontWeight.w700)),
            SizedBox(width: 4),
            Icon(Icons.expand_more, size: 18),
          ],
        ),
      ),
    );
  }
}
