"""Minimal compatibility shim for environments missing setuptools.pkg_resources.

The PhonePe SDK depends on apscheduler, which imports `pkg_resources` for
version metadata. Some Python environments may not expose this module.
"""

from importlib import metadata


class DistributionNotFound(Exception):
    pass


class _Distribution:
    def __init__(self, version: str):
        self.version = version


def get_distribution(name: str) -> _Distribution:
    try:
        version = metadata.version(name)
        return _Distribution(version)
    except metadata.PackageNotFoundError as exc:
        raise DistributionNotFound(str(exc)) from exc


def iter_entry_points(*args, **kwargs):
    # apscheduler checks setuptools entry points for plugin executors/triggers.
    # Returning an empty iterator keeps imports working in stripped environments.
    return iter(())
