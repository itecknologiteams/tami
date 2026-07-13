class TamiPlace {
  const TamiPlace({
    this.id,
    this.cityId,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
  });

  final String? id;
  final String? cityId;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
}
