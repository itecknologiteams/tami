import 'package:flutter/material.dart';

import '../../../auth/rider_session.dart';
import '../../../ui/tami_colors.dart';
import '../rider_saved_place_client.dart';

class RiderSavedPlacesScreen extends StatefulWidget {
  const RiderSavedPlacesScreen({
    required this.session,
    required this.savedPlaceClient,
    super.key,
  });

  final RiderSession session;
  final RiderSavedPlaceClient savedPlaceClient;

  @override
  State<RiderSavedPlacesScreen> createState() => _RiderSavedPlacesScreenState();
}

class _RiderSavedPlacesScreenState extends State<RiderSavedPlacesScreen> {
  late Future<List<RiderSavedPlace>> _places;

  @override
  void initState() {
    super.initState();
    _places = _load();
  }

  Future<List<RiderSavedPlace>> _load() => widget.savedPlaceClient.listPlaces(
    accessToken: widget.session.accessToken,
  );

  void _reload() {
    setState(() {
      _places = _load();
    });
  }

  Future<void> _openEditor([RiderSavedPlace? place]) async {
    final request = await Navigator.of(context).push<SaveRiderPlaceRequest>(
      MaterialPageRoute(builder: (_) => _PlaceEditorScreen(place: place)),
    );
    if (!mounted || request == null) {
      return;
    }
    try {
      await widget.savedPlaceClient.savePlace(
        accessToken: widget.session.accessToken,
        request: request,
        placeId: place?.id,
      );
      if (mounted) {
        _reload();
      }
    } on RiderSavedPlaceException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Future<void> _delete(RiderSavedPlace place) async {
    try {
      await widget.savedPlaceClient.deletePlace(
        accessToken: widget.session.accessToken,
        placeId: place.id,
      );
      if (mounted) {
        _reload();
      }
    } on RiderSavedPlaceException catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Saved places')),
      floatingActionButton: FloatingActionButton(
        tooltip: 'Add saved place',
        onPressed: _openEditor,
        child: const Icon(Icons.add),
      ),
      body: FutureBuilder<List<RiderSavedPlace>>(
        future: _places,
        builder: (context, snapshot) {
          if (snapshot.hasError) {
            return Center(
              child: OutlinedButton.icon(
                onPressed: _reload,
                icon: const Icon(Icons.refresh),
                label: const Text('Try again'),
              ),
            );
          }
          final places = snapshot.data;
          if (places == null) {
            return const Center(child: CircularProgressIndicator());
          }
          if (places.isEmpty) {
            return const Center(
              child: Text(
                'Save Home, Work, or another frequent destination.',
                textAlign: TextAlign.center,
              ),
            );
          }
          return ListView.separated(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 104),
            itemCount: places.length,
            separatorBuilder: (_, _) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final place = places[index];
              return ListTile(
                minTileHeight: 72,
                leading: Icon(
                  _designationIcon(place.designation),
                  color: TamiColors.civicGreen,
                ),
                title: Text(
                  place.label,
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                subtitle: Text(place.address),
                onTap: () => _openEditor(place),
                trailing: IconButton(
                  tooltip: 'Delete ${place.label}',
                  onPressed: () => _delete(place),
                  icon: const Icon(Icons.delete_outline),
                ),
              );
            },
          );
        },
      ),
    );
  }
}

class _PlaceEditorScreen extends StatefulWidget {
  const _PlaceEditorScreen({this.place});

  final RiderSavedPlace? place;

  @override
  State<_PlaceEditorScreen> createState() => _PlaceEditorScreenState();
}

class _PlaceEditorScreenState extends State<_PlaceEditorScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _label;
  late final TextEditingController _address;
  late final TextEditingController _latitude;
  late final TextEditingController _longitude;
  late RiderPlaceDesignation? _designation;

  @override
  void initState() {
    super.initState();
    final place = widget.place;
    _label = TextEditingController(text: place?.label ?? '');
    _address = TextEditingController(text: place?.address ?? '');
    _latitude = TextEditingController(text: place?.latitude.toString() ?? '');
    _longitude = TextEditingController(text: place?.longitude.toString() ?? '');
    _designation = place?.designation;
  }

  @override
  void dispose() {
    _label.dispose();
    _address.dispose();
    _latitude.dispose();
    _longitude.dispose();
    super.dispose();
  }

  void _save() {
    if (!_formKey.currentState!.validate()) {
      return;
    }
    Navigator.of(context).pop(
      SaveRiderPlaceRequest(
        designation: _designation,
        label: _label.text.trim(),
        address: _address.text.trim(),
        latitude: double.parse(_latitude.text.trim()),
        longitude: double.parse(_longitude.text.trim()),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          widget.place == null ? 'Add saved place' : 'Edit saved place',
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
          children: [
            DropdownButtonFormField<RiderPlaceDesignation?>(
              initialValue: _designation,
              decoration: const InputDecoration(labelText: 'Type'),
              items: const [
                DropdownMenuItem(value: null, child: Text('Other')),
                DropdownMenuItem(
                  value: RiderPlaceDesignation.home,
                  child: Text('Home'),
                ),
                DropdownMenuItem(
                  value: RiderPlaceDesignation.work,
                  child: Text('Work'),
                ),
              ],
              onChanged: (value) => setState(() => _designation = value),
            ),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('place-label'),
              controller: _label,
              decoration: const InputDecoration(labelText: 'Label'),
              validator: _required,
            ),
            const SizedBox(height: 16),
            TextFormField(
              key: const Key('place-address'),
              controller: _address,
              decoration: const InputDecoration(labelText: 'Address'),
              validator: _required,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    key: const Key('place-latitude'),
                    controller: _latitude,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    decoration: const InputDecoration(labelText: 'Latitude'),
                    validator: (value) => _coordinate(value, -90, 90),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextFormField(
                    key: const Key('place-longitude'),
                    controller: _longitude,
                    keyboardType: const TextInputType.numberWithOptions(
                      decimal: true,
                      signed: true,
                    ),
                    decoration: const InputDecoration(labelText: 'Longitude'),
                    validator: (value) => _coordinate(value, -180, 180),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 28),
            SizedBox(
              height: 52,
              child: FilledButton(
                onPressed: _save,
                child: const Text('Save place'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String? _required(String? value) {
    return value == null || value.trim().isEmpty ? 'Required' : null;
  }

  static String? _coordinate(String? value, double minimum, double maximum) {
    final number = double.tryParse(value?.trim() ?? '');
    if (number == null || number < minimum || number > maximum) {
      return 'Invalid';
    }
    return null;
  }
}

IconData _designationIcon(RiderPlaceDesignation? designation) {
  return switch (designation) {
    RiderPlaceDesignation.home => Icons.home_outlined,
    RiderPlaceDesignation.work => Icons.business_center_outlined,
    null => Icons.bookmark_outline,
  };
}
