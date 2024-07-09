# Scanners

Scanners in Ctrlplane are automated processes responsible for discovering,
registering, and updating deployment targets. They continuously monitor your
infrastructure and external systems, ensuring that Ctrlplane has an accurate and
up-to-date representation of your deployment landscape.

### How Scanners Work

- Discovery: Scanners periodically scan your defined infrastructure and external
  systems, identifying potential deployment targets based on configured
  criteria.
- Registration: When a new deployment target is discovered, the scanner
  registers it in Ctrlplane, including relevant metadata such as labels and
  associated information.
- Update: For existing deployment targets, scanners detect any changes and
  update the corresponding information in Ctrlplane to ensure accuracy.

### Scanners

#### Offical

- [Google](/scanners/google/): Scan google resource into ctrlplane.

#### Community

Open a PR to add community built scanners
