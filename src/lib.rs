mod utils;

use maxminddb::geoip2;
use serde::Serialize;
use std::collections::BTreeMap;
use std::net::IpAddr;
#[cfg(feature = "talc")]
use talc::*;
use tsify_next::Tsify;
use wasm_bindgen::prelude::*; // Rename to avoid confusion

// When the `talc_alloc` feature is enabled, use `talc_alloc` as the global
// allocator.
#[cfg(feature = "talc")]
static mut ARENA: [u8; 10000] = [0; 10000];

#[cfg(feature = "talc")]
#[global_allocator]
static ALLOCATOR: talc::Talck<spin::Mutex<()>, ClaimOnOom> = talc::Talc::new(unsafe {
    // if we're in a hosted environment, the Rust runtime may allocate before
    // main() is called, so we need to initialize the arena automatically
    ClaimOnOom::new(Span::from_array(core::ptr::addr_of!(ARENA).cast_mut()))
})
.lock();

/// Metadata about the MaxMind database.
///
/// @example
/// ```js
/// const metadata = maxmind.getMetadata();
/// console.log(metadata.databaseType); // "GeoIP2-City"
/// console.log(metadata.buildEpoch); // 1234567890
/// ```
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct Metadata {
    pub binary_format_major_version: u16,
    pub binary_format_minor_version: u16,
    pub build_epoch: u64,
    pub database_type: String,
    pub description: BTreeMap<String, String>,
    pub ip_version: u16,
    pub languages: Vec<String>,
    pub node_count: u32,
    pub record_size: u16,
}
impl Metadata {
    pub fn new(db: &maxminddb::Reader<Vec<u8>>) -> Metadata {
        let metadata = &db.metadata;
        Metadata {
            binary_format_major_version: metadata.binary_format_major_version.clone(),
            binary_format_minor_version: metadata.binary_format_minor_version.clone(),
            build_epoch: metadata.build_epoch.clone(),
            database_type: metadata.database_type.clone(),
            description: metadata.description.clone(),
            ip_version: metadata.ip_version.clone(),
            languages: metadata.languages.clone(),
            node_count: metadata.node_count.clone(),
            record_size: metadata.record_size.clone(),
        }
    }
}

/// Record containing city information including name and geoname ID.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CityRecord {
    #[tsify(optional)]
    pub geoname_id: Option<u32>,
    #[tsify(optional)]
    pub names: Option<BTreeMap<String, String>>,
}

/// Record containing continent information including code, geoname ID, and localized names.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct ContinentRecord {
    #[tsify(optional)]
    pub code: Option<String>,
    #[tsify(optional)]
    pub geoname_id: Option<u32>,
    #[tsify(optional)]
    pub names: Option<BTreeMap<String, String>>,
}

/// Record containing country information including ISO code, geoname ID, and localized names.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CountryRecord {
    #[tsify(optional)]
    pub geoname_id: Option<u32>,
    #[tsify(optional)]
    pub iso_code: Option<String>,
    #[tsify(optional)]
    pub names: Option<BTreeMap<String, String>>,
}

/// Record containing subdivision (state/province) information including ISO code, geoname ID, and localized names.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct SubdivisionRecord {
    #[tsify(optional)]
    pub geoname_id: Option<u32>,
    #[tsify(optional)]
    pub iso_code: Option<String>,
    #[tsify(optional)]
    pub names: Option<BTreeMap<String, String>>,
}

/// Record containing location information including latitude, longitude, and timezone.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct LocationRecord {
    #[tsify(optional)]
    pub latitude: Option<f64>,
    #[tsify(optional)]
    pub longitude: Option<f64>,
    #[tsify(optional)]
    pub time_zone: Option<String>,
}

/// Response containing city-level geolocation data for an IP address.
///
/// @example
/// ```js
/// const response = maxmind.lookupCity("8.8.8.8");
/// console.log(response.city?.names?.en); // "Mountain View"
/// console.log(response.country?.isoCode); // "US"
/// console.log(response.location?.latitude); // 37.4223
/// ```
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct CityResponse {
    #[tsify(optional)]
    pub city: Option<CityRecord>,
    #[tsify(optional)]
    pub continent: Option<ContinentRecord>,
    #[tsify(optional)]
    pub country: Option<CountryRecord>,
    #[tsify(optional)]
    pub subdivisions: Option<Vec<SubdivisionRecord>>,
    #[tsify(optional)]
    pub location: Option<LocationRecord>,
    // Add other fields you need
}

/// Response containing city-level geolocation data and the network prefix length for an IP address.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct PrefixResponse {
    pub city: CityResponse,
    pub prefix_length: usize,
}

/// Response containing information about a particular ASN.
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct AsnResponse {
    #[tsify(optional)]
    pub as_num: Option<u32>,
    #[tsify(optional)]
    pub as_organization: Option<String>,
}

/// Response containing ISP information for an IP address.
///
/// @example
/// ```js
/// const response = maxmind.lookupIsp("8.8.8.8");
/// console.log(response.asn?.as_num); // 15169
/// console.log(response.asn?.as_organization); // "Google LLC"
/// console.log(response.isp); // "Google LLC"
/// console.log(response.organization); // "Google LLC"
/// ```
#[derive(Serialize, Tsify)]
#[tsify(into_wasm_abi)]
pub struct IspResponse {
    #[tsify(optional)]
    pub asn: AsnResponse,
    #[tsify(optional)]
    pub isp: Option<String>,
    #[tsify(optional)]
    pub organization: Option<String>,
    #[tsify(optional)]
    pub mobile_country_code: Option<String>,
    #[tsify(optional)]
    pub mobile_network_code: Option<String>,
}

/// MaxMind database reader.
#[wasm_bindgen]
pub struct Maxmind {
    db: maxminddb::Reader<Vec<u8>>,
}

fn convert_isp_response(isp_record: geoip2::Isp) -> IspResponse {
    IspResponse {
        asn: AsnResponse {
            as_num: isp_record.autonomous_system_number,
            as_organization: isp_record
                .autonomous_system_organization
                .map(|s| s.to_string()),
        },
        isp: isp_record.isp.map(|s| s.to_string()),
        organization: isp_record.organization.map(|s| s.to_string()),
        mobile_country_code: isp_record.mobile_country_code.map(|s| s.to_string()),
        mobile_network_code: isp_record.mobile_network_code.map(|s| s.to_string()),
    }
}

fn convert_city_response(city_record: geoip2::City) -> CityResponse {
    CityResponse {
        city: city_record.city.map(|city| CityRecord {
            geoname_id: city.geoname_id,
            names: city.names.map(|n| {
                n.into_iter()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect()
            }),
        }),
        continent: city_record.continent.map(|cont| ContinentRecord {
            code: cont.code.map(|s| s.to_string()),
            geoname_id: cont.geoname_id,
            names: cont.names.map(|n| {
                n.into_iter()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect()
            }),
        }),
        country: city_record.country.map(|country| CountryRecord {
            geoname_id: country.geoname_id,
            iso_code: country.iso_code.map(|s| s.to_string()),
            names: country.names.map(|n| {
                n.into_iter()
                    .map(|(k, v)| (k.to_string(), v.to_string()))
                    .collect()
            }),
        }),
        subdivisions: city_record.subdivisions.map(|subdivisions| {
            subdivisions
                .into_iter()
                .map(|sub| SubdivisionRecord {
                    geoname_id: sub.geoname_id,
                    iso_code: sub.iso_code.map(|s| s.to_string()),
                    names: sub.names.map(|n| {
                        n.into_iter()
                            .map(|(k, v)| (k.to_string(), v.to_string()))
                            .collect()
                    }),
                })
                .collect()
        }),
        location: city_record.location.map(|loc| LocationRecord {
            latitude: loc.latitude,
            longitude: loc.longitude,
            time_zone: loc.time_zone.map(|s| s.to_string()),
        }),
    }
}

/// MaxMind database reader.
#[wasm_bindgen]
impl Maxmind {
    /// Creates a new MaxMind database reader from a binary database file.
    ///
    /// @example
    /// ```js
    /// const db = new Maxmind(dbBinary);
    /// ```
    #[wasm_bindgen(constructor)]
    pub fn new(
        #[wasm_bindgen(param_description = "The binary database file as a Uint8Array")] js_db: Box<
            [u8],
        >,
    ) -> Maxmind {
        let local_arr: Vec<u8> = js_db.into_vec();
        Maxmind {
            db: maxminddb::Reader::from_source(local_arr).expect_throw("Invalid Database Binary"),
        }
    }

    /// Looks up city-level geolocation data for an IP address.
    ///
    /// @example
    /// ```js
    /// const response = maxmind.lookupCity("8.8.8.8");
    /// console.log(response.city?.names?.en); // "Mountain View"
    /// console.log(response.country?.isoCode); // "US"
    /// ```
    #[wasm_bindgen(return_description = "City-level geolocation data for the IP address")]
    pub fn lookup_city(
        &self,
        #[wasm_bindgen(param_description = "IPv4 or IPv6 address to look up")] ip_str: &str,
    ) -> Result<CityResponse, JsError> {
        let ip_addr_str: IpAddr = ip_str.parse::<IpAddr>().expect_throw("Invalid IP");
        let result: geoip2::City = self
            .db
            .lookup(ip_addr_str)
            .expect_throw("Lookup Error")
            .expect_throw("Result Not Found");

        // Convert the geoip2::City to our CityResponse
        let response = convert_city_response(result);

        Ok(response)
    }

    /// Looks up ISP data for an IP address.
    ///
    /// @example
    /// ```js
    /// const response = maxmind.lookupIsp("8.8.8.8");
    /// console.log(response.asn?.as_num); // 15169
    /// console.log(response.asn?.as_organization); // "Google LLC"
    /// console.log(response.isp); // "Google LLC"
    /// console.log(response.organization); // "Google LLC"
    /// ```
    #[wasm_bindgen(return_description = "ISP data for the IP address")]
    pub fn lookup_isp(
        &self,
        #[wasm_bindgen(param_description = "IPv4 or IPv6 address to look up")] ip_str: &str,
    ) -> Result<IspResponse, JsError> {
        let ip_addr_str: IpAddr = ip_str.parse::<IpAddr>().expect_throw("Invalid IP");
        let result: geoip2::Isp = self
            .db
            .lookup(ip_addr_str)
            .expect_throw("Lookup Error")
            .expect_throw("Result Not Found");

        // Convert the geoip2::Isp to our IspResponse
        let response = convert_isp_response(result);

        Ok(response)
    }

    /// Looks up city-level geolocation data and prefix length for an IP address.
    ///
    /// @example
    /// ```js
    /// const response = maxmind.lookupPrefix("8.8.8.8");
    /// console.log(response.city?.names?.en); // "Mountain View"
    /// console.log(response.prefixLength); // 24
    /// ```
    #[wasm_bindgen(return_description = "City-level geolocation data and network prefix length")]
    pub fn lookup_prefix(
        &self,
        #[wasm_bindgen(param_description = "IPv4 or IPv6 address to look up")] ip_str: &str,
    ) -> Result<PrefixResponse, JsError> {
        let ip_addr_str: IpAddr = ip_str.parse::<IpAddr>().expect_throw("Invalid IP");
        let result: (Option<geoip2::City>, usize) = self
            .db
            .lookup_prefix(ip_addr_str)
            .expect_throw("Lookup Error");

        let response = convert_city_response(result.0.expect_throw("Result Not Found"));

        Ok(PrefixResponse {
            city: response,
            prefix_length: result.1,
        })
    }

    /// Gets metadata about the loaded MaxMind database.
    ///
    /// @example
    /// ```js
    /// const metadata = maxmind.getMetadata();
    /// console.log(metadata.databaseType); // "GeoIP2-City"
    /// console.log(metadata.buildEpoch); // 1234567890
    /// ```
    #[wasm_bindgen(getter = metadata, return_description = "Metadata about the loaded database")]
    pub fn get_metadata(&self) -> Result<Metadata, JsError> {
        let metadata = Metadata::new(&self.db);
        Ok(metadata)
    }
}

/// Initialize the MaxMind database reader.
#[wasm_bindgen(start)]
pub fn run() -> Result<(), JsValue> {
    utils::set_panic_hook();
    Ok(())
}
