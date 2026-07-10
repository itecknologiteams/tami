class RiderCity {
  const RiderCity({required this.id, required this.name});

  final String id;
  final String name;

  factory RiderCity.fromJson(Map<String, dynamic> json) {
    return RiderCity(id: json['id'] as String, name: json['name'] as String);
  }
}

class DevelopmentOtpChallenge {
  const DevelopmentOtpChallenge({
    required this.challengeId,
    required this.developmentCode,
    required this.expiresAt,
  });

  final String challengeId;
  final String developmentCode;
  final String expiresAt;

  factory DevelopmentOtpChallenge.fromJson(Map<String, dynamic> json) {
    return DevelopmentOtpChallenge(
      challengeId: json['challengeId'] as String,
      developmentCode: json['developmentCode'] as String,
      expiresAt: json['expiresAt'] as String,
    );
  }
}

class RiderProfile {
  const RiderProfile({
    required this.id,
    required this.phone,
    required this.cityId,
    required this.name,
    required this.email,
    required this.imageUrl,
  });

  final String id;
  final String phone;
  final String cityId;
  final String? name;
  final String? email;
  final String? imageUrl;

  factory RiderProfile.fromJson(Map<String, dynamic> json) {
    return RiderProfile(
      id: json['id'] as String,
      phone: json['phone'] as String,
      cityId: json['cityId'] as String,
      name: json['name'] as String?,
      email: json['email'] as String?,
      imageUrl: json['imageUrl'] as String?,
    );
  }
}

class RiderSession {
  const RiderSession({required this.accessToken, required this.rider});

  final String accessToken;
  final RiderProfile rider;

  factory RiderSession.fromJson(Map<String, dynamic> json) {
    return RiderSession(
      accessToken: json['accessToken'] as String,
      rider: RiderProfile.fromJson(json['rider'] as Map<String, dynamic>),
    );
  }
}
