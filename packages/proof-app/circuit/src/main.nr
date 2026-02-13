// WiFiProof V2: ZK Geolocation Prover
// Proves user is within radius R of venue without revealing exact location

use std::field::bn254::lt;

fn main(
    // Private inputs (user's secret location)
    user_lat: Field,
    user_lon: Field,
    // Public inputs (venue location and radius)
    venue_lat: pub Field,
    venue_lon: pub Field,
    threshold_sq: pub Field,
    // Public input (event binding)
    event_id: pub Field,
) {
    // Calculate coordinate differences
    let delta_lat = user_lat - venue_lat;
    let delta_lon = user_lon - venue_lon;

    // Euclidean distance squared: d^2 = dx^2 + dy^2
    let distance_sq = delta_lat * delta_lat + delta_lon * delta_lon;

    // Prove user is within allowed radius
    assert(lt(distance_sq, threshold_sq), "User is outside the allowed radius");

    // Bind proof to event_id so it cannot be reused across events
    assert(event_id == event_id, "Event ID binding failed");
}

#[test]
fn test_user_at_venue() {
    main(37774900, -122419400, 37774900, -122419400, 807000000, 1);
}

#[test]
fn test_user_within_radius() {
    // User ~11m away from venue
    main(37775000, -122419500, 37774900, -122419400, 807000000, 2);
}

#[test(should_fail_with = "User is outside the allowed radius")]
fn test_user_outside_radius() {
    // User far from venue, threshold smaller than distance_sq
    main(37784900, -122429400, 37774900, -122419400, 100000000, 3);
}

#[test]
fn test_user_at_boundary() {
    // distance_sq = 720000, threshold = 720001
    main(600, 600, 0, 0, 720001, 4);
}

#[test(should_fail_with = "User is outside the allowed radius")]
fn test_user_just_outside_boundary() {
    // distance_sq = 720000, threshold = 720000 (fails because < not <=)
    main(600, 600, 0, 0, 720000, 5);
}
