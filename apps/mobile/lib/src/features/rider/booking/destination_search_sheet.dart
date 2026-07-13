import 'package:flutter/material.dart';

import '../../../ui/tami_colors.dart';
import '../../../ui/tami_glass.dart';
import 'tami_place.dart';
import '../rider_saved_place_client.dart';

const _destinationOptions = [
  TamiPlace(
    name: 'Mazar-e-Quaid',
    address: 'Mazar-e-Quaid, Karachi',
    latitude: 24.8753,
    longitude: 67.0407,
  ),
  TamiPlace(
    name: 'Frere Hall',
    address: 'Civil Lines, Karachi',
    latitude: 24.8468,
    longitude: 67.0303,
  ),
  TamiPlace(
    name: 'Clifton Beach',
    address: 'Clifton, Karachi',
    latitude: 24.8138,
    longitude: 67.0307,
  ),
  TamiPlace(
    name: 'Hyderabad Railway Station',
    address: 'Hyderabad, Sindh',
    latitude: 25.3791,
    longitude: 68.3728,
  ),
];

class DestinationSearchSheet extends StatefulWidget {
  const DestinationSearchSheet({
    this.savedPlaces = const [],
    this.showSavedPlacePrompts = true,
    super.key,
  });

  final List<RiderSavedPlace> savedPlaces;
  final bool showSavedPlacePrompts;

  @override
  State<DestinationSearchSheet> createState() => _DestinationSearchSheetState();
}

class _DestinationSearchSheetState extends State<DestinationSearchSheet> {
  String _query = '';

  List<TamiPlace> get _matchingDestinations {
    final query = _query.trim().toLowerCase();
    if (query.isEmpty) {
      return const [];
    }
    return _destinationOptions
        .where(
          (place) =>
              place.name.toLowerCase().contains(query) ||
              place.address.toLowerCase().contains(query),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Align(
        alignment: Alignment.bottomCenter,
        widthFactor: 1,
        heightFactor: 1,
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: TamiGlass(
            key: const Key('destination-search-glass'),
            semanticLabel: 'Choose destination',
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 42, height: 4, color: const Color(0xFFB8CCC5)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    IconButton(
                      tooltip: 'Close destination search',
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back),
                    ),
                    const SizedBox(width: 8),
                    const Expanded(
                      child: Text(
                        'Choose destination',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextField(
                  key: const Key('destination-search'),
                  autofocus: true,
                  onChanged: (value) => setState(() => _query = value),
                  decoration: const InputDecoration(
                    hintText: 'Search destination',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.all(Radius.circular(8)),
                    ),
                  ),
                ),
                if (_query.isEmpty) ...[
                  const SizedBox(height: 24),
                  if (widget.savedPlaces.isNotEmpty)
                    for (final place in widget.savedPlaces)
                      _SavedPlaceRow(
                        icon: _savedPlaceIcon(place.designation),
                        title: place.label,
                        subtitle: place.address,
                        onTap: () => Navigator.of(context).pop(
                          TamiPlace(
                            name: place.label,
                            address: place.address,
                            latitude: place.latitude,
                            longitude: place.longitude,
                          ),
                        ),
                      )
                  else if (widget.showSavedPlacePrompts) ...[
                    const _SavedPlaceRow(
                      icon: Icons.home_outlined,
                      title: 'Home',
                      subtitle: 'Save an address for faster booking',
                    ),
                    const SizedBox(height: 12),
                    const _SavedPlaceRow(
                      icon: Icons.business_center_outlined,
                      title: 'Work',
                      subtitle: 'Save an address for faster booking',
                    ),
                  ] else
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'No saved places yet',
                        style: TextStyle(color: TamiColors.mutedInk),
                      ),
                    ),
                ] else ...[
                  const SizedBox(height: 18),
                  for (final place in _matchingDestinations)
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      leading: const Icon(
                        Icons.location_on_outlined,
                        color: TamiColors.civicGreen,
                      ),
                      title: Text(
                        place.name,
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      subtitle: Text(place.address),
                      onTap: () => Navigator.of(context).pop(place),
                    ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SavedPlaceRow extends StatelessWidget {
  const _SavedPlaceRow({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: TamiColors.civicGreen),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle),
      trailing: const Icon(Icons.add),
      onTap: onTap,
    );
  }
}

IconData _savedPlaceIcon(RiderPlaceDesignation? designation) {
  return switch (designation) {
    RiderPlaceDesignation.home => Icons.home_outlined,
    RiderPlaceDesignation.work => Icons.business_center_outlined,
    null => Icons.bookmark_outline,
  };
}
