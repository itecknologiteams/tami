import 'package:flutter/material.dart';

import '../../auth/rider_session.dart';
import '../../maps/tami_map_surface.dart';
import '../../location/rider_location.dart';
import '../../location/rider_location_client.dart';
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
import 'rider_pricing_client.dart';
import 'rider_place_search_client.dart';

export 'booking/tami_place.dart';

class RiderHomeScreen extends StatefulWidget {
  const RiderHomeScreen({
    this.mapSurface,
    this.session,
    this.bookingClient,
    this.chatClient,
    this.rideQueryClient,
    this.savedPlaceClient,
    this.pricingClient,
    this.placeSearchClient,
    this.locationClient,
    this.initialPickup,
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
  final RiderPricingClient? pricingClient;
  final RiderPlaceSearchClient? placeSearchClient;
  final RiderLocationClient? locationClient;
  final TamiPlace? initialPickup;
  final RiderBookingRide? initialRide;
  final TamiPlace? initialDestination;

  @override
  State<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends State<RiderHomeScreen> {
  TamiPlace? _destination;
  TamiPlace? _pickup;
  RiderBookingRide? _activeRide;
  List<RiderSavedPlace> _savedPlaces = const [];
  RiderLocationStatus _pickupStatus = RiderLocationStatus.failed;
  bool _isLocatingPickup = false;

  @override
  void initState() {
    super.initState();
    _destination = widget.initialDestination;
    _pickup = widget.initialPickup;
    if (_pickup != null) {
      _pickupStatus = RiderLocationStatus.ready;
    }
    _activeRide = widget.initialRide;
    if (_activeRide == null) {
      _restoreCurrentRide().whenComplete(() {
        if (mounted && _activeRide == null && _pickup == null) {
          _resolveCurrentPickup();
        }
      });
    } else if (_pickup == null) {
      _resolveCurrentPickup();
    }
    _loadSavedPlaces();
  }

  Future<void> _resolveCurrentPickup() async {
    final locationClient = widget.locationClient;
    final placeSearchClient = widget.placeSearchClient;
    final accessToken = widget.session?.accessToken;
    if (locationClient == null || placeSearchClient == null || accessToken == null) {
      return;
    }
    setState(() => _isLocatingPickup = true);
    final result = await locationClient.locate();
    if (!mounted) {
      return;
    }
    if (result.status != RiderLocationStatus.ready || result.location == null) {
      setState(() {
        _pickup = null;
        _pickupStatus = result.status;
        _isLocatingPickup = false;
      });
      return;
    }
    try {
      final location = result.location!;
      final place = await placeSearchClient.reverse(
        accessToken: accessToken,
        latitude: location.latitude,
        longitude: location.longitude,
      );
      if (mounted) {
        setState(() {
          _pickup = place;
          _pickupStatus = RiderLocationStatus.ready;
          _isLocatingPickup = false;
        });
      }
    } on RiderPlaceSearchException {
      if (mounted) {
        setState(() {
          _pickup = null;
          _pickupStatus = RiderLocationStatus.failed;
          _isLocatingPickup = false;
        });
      }
    }
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
          estimatedFareMinor: ride.estimatedFareMinor,
          currency: ride.currency,
          farePolicyVersion: ride.farePolicyVersion,
          paymentMethod: ride.paymentMethod,
        );
        _destination = TamiPlace(
          name: ride.destination.address.split(',').first,
          address: ride.destination.address,
          latitude: ride.destination.latitude,
          longitude: ride.destination.longitude,
        );
        _pickup = TamiPlace(
          name: ride.pickup.address.split(',').first,
          address: ride.pickup.address,
          latitude: ride.pickup.latitude,
          longitude: ride.pickup.longitude,
        );
        _pickupStatus = RiderLocationStatus.ready;
        _isLocatingPickup = false;
      });
    } on RiderRideQueryException {
      // The booking surface remains available; reconnect recovery follows later.
    }
  }

  Future<void> _openDestinationSearch() async {
    final placeSearchClient = widget.placeSearchClient;
    final accessToken = widget.session?.accessToken;
    if (placeSearchClient == null || accessToken == null) {
      return;
    }
    final destination = await showModalBottomSheet<TamiPlace>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => RiderPlaceSearchSheet(
        mode: RiderPlaceSearchMode.destination,
        accessToken: accessToken,
        searchClient: placeSearchClient,
        savedPlaces: _savedPlaces,
        showSavedPlacePrompts: widget.savedPlaceClient == null,
        proximity: _pickup == null
            ? null
            : RiderPlaceProximity(
                latitude: _pickup!.latitude,
                longitude: _pickup!.longitude,
              ),
      ),
    );
    if (!mounted || destination == null) {
      return;
    }

    setState(() => _destination = destination);
    _openRideOptions(destination);
  }

  Future<void> _openPickupSearch() async {
    final placeSearchClient = widget.placeSearchClient;
    final accessToken = widget.session?.accessToken;
    if (placeSearchClient == null || accessToken == null) {
      return;
    }
    final pickup = await showModalBottomSheet<TamiPlace>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => RiderPlaceSearchSheet(
        mode: RiderPlaceSearchMode.pickup,
        accessToken: accessToken,
        searchClient: placeSearchClient,
        savedPlaces: _savedPlaces,
        showSavedPlacePrompts: widget.savedPlaceClient == null,
        proximity: _pickup == null
            ? null
            : RiderPlaceProximity(
                latitude: _pickup!.latitude,
                longitude: _pickup!.longitude,
              ),
      ),
    );
    if (!mounted || pickup == null) {
      return;
    }
    setState(() {
      _pickup = pickup;
      _pickupStatus = RiderLocationStatus.ready;
      _isLocatingPickup = false;
    });
  }

  Future<void> _openLocationSettings() async {
    await widget.locationClient?.openSettings(_pickupStatus);
  }

  void _openRideOptions(TamiPlace destination) {
    final pickup = _pickup;
    if (pickup == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Choose a pickup before selecting a ride.')),
      );
      return;
    }
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => RideOptionsSheet(
        destination: destination,
        pickup: RiderCoordinates(
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          address: pickup.address,
        ),
        accessToken: widget.session?.accessToken,
        pricingClient: widget.pricingClient,
        onConfirm: _requestRide,
      ),
    );
  }

  Future<void> _requestRide(RideSelection selection) async {
    final bookingClient = widget.bookingClient;
    final session = widget.session;
    final pickup = _pickup;
    if (bookingClient == null || session == null || pickup == null) {
      throw const RiderBookingException('Sign in to request a ride.');
    }

    final ride = await bookingClient.createRide(
      accessToken: session.accessToken,
      request: CreateRiderRideRequest(
        categoryCode: selection.categoryCode,
        pickup: RiderCoordinates(
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          address: pickup.address,
        ),
        destination: RiderCoordinates(
          latitude: selection.destination.latitude,
          longitude: selection.destination.longitude,
          address: selection.destination.address,
        ),
        scheduledPickupAt: selection.scheduledPickupAt,
        paymentMethod: selection.paymentMethod,
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
                      _CityPill(cityName: widget.session?.rider.cityName ?? 'Sindh'),
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
                            pickup: _pickup,
                            pickupStatus: _pickupStatus,
                            isLocatingPickup: _isLocatingPickup,
                            onPickupTap: _openPickupSearch,
                            onPickupRetry: _resolveCurrentPickup,
                            onPickupSettings: _openLocationSettings,
                            destination: _destination,
                            onDestinationTap: _openDestinationSearch,
                          )
                        : ActiveRidePanel(
                            destination: _destination!,
                            rideState: _activeRide!.state,
                            estimatedFareMinor: _activeRide!.estimatedFareMinor,
                            currency: _activeRide!.currency,
                            paymentMethod: _activeRide!.paymentMethod,
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
  const _CityPill({required this.cityName});

  final String cityName;

  @override
  Widget build(BuildContext context) {
    return TamiGlass(
      key: Key('rider-city-glass'),
      level: TamiGlassLevel.navigation,
      semanticLabel: 'Service city $cityName',
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
            Text(cityName, style: const TextStyle(fontWeight: FontWeight.w700)),
            SizedBox(width: 4),
            Icon(Icons.expand_more, size: 18),
          ],
        ),
      ),
    );
  }
}
