# Claude Code Environment Variables: Third-Party and System (Part 3)

These are the names that bundled libraries read, and not Claude Code.
They run from `APP_URL` to `GRPC_TRACE`, in 65 rows.

## Read by Bundled Libraries

Claude Code ships with some libraries inside its program.
These libraries read the names below, and Claude Code itself does not use them.
A name here works only when the library code runs.

| Name | Mark | Library | What It Does |
| --- | --- | --- | --- |
| `APP_URL` | 🔍 | cloud detector | A bundled cloud detector treats a value that contains `ondigitalocean.app` as the DigitalOcean App Platform. |
| `AWS_ACCOUNT_ID` | 🔍 | AWS SDK | The bundled AWS SDK env credential provider reads it with the key, secret, token, expiry, and scope vars. |
| `AWS_AUTH_SCHEME_PREFERENCE` | 🔍 | AWS SDK | The bundled AWS SDK reads it as a comma list of preferred auth schemes. |
| `AWS_CONTAINER_AUTHORIZATION_TOKEN` | 🔍 | AWS SDK | The bundled AWS SDK sends it as the auth value to the container credentials endpoint. |
| `AWS_CONTAINER_AUTHORIZATION_TOKEN_FILE` | 🔍 | AWS SDK | The bundled AWS SDK reads the container credentials auth token from this file path. |
| `AWS_CREDENTIAL_EXPIRATION` | ✅ | AWS SDK | The bundled AWS SDK env credential provider reads it as the expiry time of the env credentials. |
| `AWS_DEFAULTS_MODE` | 🔍 | AWS SDK | The bundled AWS SDK reads it as the SDK defaults mode. |
| `AWS_EC2_METADATA_DISABLED` | 🔍 | AWS SDK | Turns off the EC2 instance metadata lookup in the bundled AWS SDK credential chain and region defaults. |
| `AWS_EC2_METADATA_SERVICE_ENDPOINT` | 🔍 | AWS SDK | Sets the EC2 metadata service URL for the bundled AWS SDK. |
| `AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE` | 🔍 | AWS SDK | Picks `IPv4` or `IPv6` for the EC2 metadata service address in the bundled AWS SDK. |
| `AWS_EC2_METADATA_V1_DISABLED` | 🔍 | AWS SDK | Blocks the IMDSv1 fallback in the bundled AWS SDK, so only token-based IMDSv2 is used. |
| `AWS_ENDPOINT_URL_SSO` | 🔍 | AWS SDK | Overrides the AWS SSO endpoint in the bundled AWS SDK. |
| `AWS_ENDPOINT_URL_SSO_OIDC` | 🔍 | AWS SDK | Overrides the AWS SSO OIDC endpoint in the bundled AWS SDK. |
| `AWS_LAMBDA_BENCHMARK_MODE` | 🔍 | AWS SDK | Enables a test reset hook in the bundled AWS Lambda `InvokeStore`. |
| `AWS_LAMBDA_MAX_CONCURRENCY` | 🔍 | AWS SDK | Selects the concurrent-aware store in the bundled AWS Lambda `InvokeStore` when present. |
| `AWS_LOGIN_CACHE_DIRECTORY` | 🔍 | AWS SDK | Sets the cache folder for the AWS SDK `login_session` credential provider (`aws login`). |
| `AWS_MAX_ATTEMPTS` | 🔍 | AWS SDK | Sets the maximum retry attempts of the bundled AWS SDK clients. |
| `AWS_RETRY_MODE` | 🔍 | AWS SDK | Sets the retry mode of the bundled AWS SDK clients. |
| `AWS_ROLE_SESSION_NAME` | 🔍 | AWS SDK | Sets the session name for AWS web identity role assumption in the bundled AWS SDK. |
| `AWS_SDK_UA_APP_ID` | 🔍 | AWS SDK | Adds an `app/<id>` part to the user agent of the bundled AWS SDK calls. |
| `AWS_USE_DUALSTACK_ENDPOINT` | 🔍 | AWS SDK | Turns on AWS dual-stack endpoints in the AWS SDK. |
| `AZURE_ADDITIONALLY_ALLOWED_TENANTS` | 🔍 | Azure SDK | Lists extra tenant IDs the bundled Azure identity library may use. |
| `AZURE_AUTHORITY_HOST` | 🔍 | Azure SDK | Sets the Microsoft Entra authority URL of the bundled Azure identity library. |
| `AZURE_CLIENT_CERTIFICATE_PASSWORD` | 🔍 | Azure SDK | Gives the password of the client certificate for the Azure `EnvironmentCredential`. |
| `AZURE_CLIENT_CERTIFICATE_PATH` | 🔍 | Azure SDK | Gives the client certificate path for the Azure `EnvironmentCredential`. |
| `AZURE_CLIENT_ID` | ✅ | Azure SDK | Gives the Azure app client ID for the bundled Azure identity credentials. |
| `AZURE_CLIENT_SECRET` | 🔍 | Azure SDK | Gives the Azure app client secret for the Azure `EnvironmentCredential`. |
| `AZURE_CLIENT_SEND_CERTIFICATE_CHAIN` | 🔍 | Azure SDK | Makes the Azure client certificate credential send the full certificate chain. |
| `AZURE_FEDERATED_TOKEN_FILE` | 🔍 | Azure SDK | Gives the federated token file for Azure workload identity login. |
| `AZURE_IDENTITY_DISABLE_MULTITENANTAUTH` | 🔍 | Azure SDK | Turns off multi-tenant token requests in the Azure identity library, so the configured tenant is always used. |
| `AZURE_LOG_LEVEL` | 🔍 | Azure SDK | Sets the log level of the bundled Azure SDK logger. |
| `AZURE_PASSWORD` | 🔍 | Azure SDK | Gives the password for the Azure username and password credential. |
| `AZURE_POD_IDENTITY_AUTHORITY_HOST` | 🔍 | Azure SDK | Sets the Azure pod identity authority host for managed identity login in the bundled MSAL library. |
| `AZURE_REGIONAL_AUTHORITY_NAME` | 🔍 | Azure SDK | Sets the regional authority name for MSAL token requests. |
| `AZURE_TENANT_ID` | ✅ | Azure SDK | Gives the Azure tenant ID for the bundled Azure identity credentials. |
| `AZURE_TOKEN_CREDENTIALS` | 🔍 | Azure SDK | Picks which Azure credential chain `DefaultAzureCredential` uses. |
| `AZURE_USERNAME` | 🔍 | Azure SDK | Gives the username for the Azure username and password credential. |
| `BUF_BIGINT_DISABLE` | 🔍 | protobuf | Turns off native `BigInt` use in the bundled protobuf library, so it uses its fallback int64 code. |
| `BUN_DISABLE_DYNAMIC_CHUNK_SIZE` | 🔍 | Bun runtime | Turns off dynamic chunk size tuning for native readable streams in the Bun runtime. |
| `BUN_FEATURE_FLAG_VERBOSE_WARNINGS` | 🔍 | Bun runtime | Shows the Bun runtime warning for unsupported `async_hooks` use. |
| `BUN_INSPECT_NOTIFY` | 🔍 | Bun runtime | Tells the Bun inspector where to report that it listens. |
| `BUN_PORT` | 🔍 | Bun runtime | Gives a fallback port for the Bun dev server when the default port is busy. |
| `CHOKIDAR_INTERVAL` | 🔍 | chokidar | Sets the poll interval for the bundled `chokidar` file watcher when polling is on. |
| `CHOKIDAR_USEPOLLING` | 🔍 | chokidar | Forces the bundled `chokidar` file watcher to use polling or not. |
| `CLOUD_RUN_JOB` | 🔍 | Google auth | Marks a Google Cloud Run job. |
| `DATABASEURL` | 🔍 | Bun SQL | Is a second spelling of `DATABASE_URL` for the embedded Bun SQL client. |
| `DATABASE_URL` | ✅ | Bun SQL | Gives the default connection URL to the embedded Bun SQL client. |
| `DEBUG_AUTH` | 🔍 | Google auth | Prints GCP metadata detection errors with `console.info`. |
| `DETECT_GCP_RETRIES` | 🔍 | Google auth | Sets the number of retries for GCP metadata server detection. |
| `FUNCTION_NAME` | 🔍 | Google auth | Marks a Google Cloud Functions runtime in the bundled Google auth library. |
| `FUNCTION_TARGET` | 🔍 | Google auth | Marks a Google Cloud Functions runtime in the bundled Google auth library. |
| `GAE_MODULE_NAME` | 🔍 | Google auth | Marks a Google App Engine runtime in the bundled Google auth library. |
| `GAE_SERVICE` | 🔍 | Google auth | Marks a Google App Engine runtime in the bundled Google auth library. |
| `GCE_METADATA_HOST` | 🔍 | Google auth | Sets the host of the Compute Engine metadata server for the bundled Google auth library. |
| `GCE_METADATA_IP` | 🔍 | Google auth | Sets the address of the Compute Engine metadata server for the bundled Google auth library. |
| `GOOGLE_API_CERTIFICATE_CONFIG` | 🔍 | Google auth | Path of the certificate config for mTLS in the bundled Google auth library. |
| `GOOGLE_CLOUD_QUOTA_PROJECT` | 🔍 | Google auth | Sets the quota project of the credential in the bundled Google auth library. |
| `GRACEFUL_FS_PLATFORM` | 🔍 | graceful-fs | Overrides the platform name that the bundled `graceful-fs` patches use. |
| `GRPC_DEFAULT_SSL_ROOTS_FILE_PATH` | 🔍 | gRPC | Path of a root certificate file that the bundled gRPC library loads as its TLS roots. |
| `GRPC_EXPERIMENTAL_ENABLE_OUTLIER_DETECTION` | 🔍 | gRPC | Turns the gRPC outlier detection load balancer on or off. |
| `GRPC_NODE_TRACE` | 🔍 | gRPC | Lists the gRPC tracers to turn on. |
| `GRPC_NODE_USE_ALTERNATIVE_RESOLVER` | 🔍 | gRPC | Makes the gRPC DNS resolver use the alternative path when it is `true`. |
| `GRPC_NODE_VERBOSITY` | 🔍 | gRPC | Sets the gRPC log level. |
| `GRPC_SSL_CIPHER_SUITES` | 🔍 | gRPC | Sets the TLS cipher suites of the bundled gRPC library. |
| `GRPC_TRACE` | 🔍 | gRPC | Lists the gRPC tracers to turn on. |

## See Also

- [Part 1](Claude-Code-Env-Vars-Third-Party-And-System)
- [Part 2](Claude-Code-Env-Vars-Third-Party-And-System-2)
- [Part 4](Claude-Code-Env-Vars-Third-Party-And-System-4)
- [Environment Variables](Claude-Code-Env-Vars)
- [Probes](Claude-Code-Probes)
- [Settings](Claude-Code-Settings)
