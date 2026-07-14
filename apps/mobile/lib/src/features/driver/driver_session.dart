class DriverProfile {
  const DriverProfile({
    required this.id,
    required this.phone,
    required this.cityId,
    required this.cityName,
    required this.name,
    required this.online,
  });

  final String id;
  final String phone;
  final String cityId;
  final String cityName;
  final String name;
  final bool online;

  factory DriverProfile.fromJson(Map<String, dynamic> json) {
    return DriverProfile(
      id: json['id'] as String,
      phone: json['phone'] as String,
      cityId: json['cityId'] as String,
      cityName: json['cityName'] as String,
      name: json['name'] as String,
      online: json['online'] as bool? ?? false,
    );
  }
}

class DriverSession {
  const DriverSession({required this.accessToken, required this.driver});

  final String accessToken;
  final DriverProfile driver;

  factory DriverSession.fromJson(Map<String, dynamic> json) {
    return DriverSession(
      accessToken: json['accessToken'] as String,
      driver: DriverProfile.fromJson(json['driver'] as Map<String, dynamic>),
    );
  }
}
